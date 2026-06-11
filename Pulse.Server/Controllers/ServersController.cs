using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Pulse.Server.Data;
using Pulse.Server.Hubs;
using System.Security.Claims;
using ServerEntity = Pulse.Server.Models.Server;
using ServerMemberEntity = Pulse.Server.Models.ServerMember;
using RoomEntity = Pulse.Server.Models.Room;

namespace Pulse.Server.Controllers;

[Route("servers")]
[ApiController]
[Authorize]
public class ServersController(AppDbContext db, IHubContext<PresenceHub> hubContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateServer([FromBody] CreateServerRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });
        if (req.Name.Trim().Length > 80)
            return BadRequest(new { error = "Server name must be 80 characters or fewer." });

        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(callerId, out var ownerGuid))
            return Unauthorized(new { error = "Invalid token." });

        var inviteCode = Guid.NewGuid().ToString("N")[..12];
        var server = new ServerEntity { Name = req.Name.Trim(), OwnerId = ownerGuid, InviteCode = inviteCode, CreatedAt = DateTime.UtcNow };
        db.Servers.Add(server);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "A server with that name already exists." });
        }

        db.ServerMembers.Add(new ServerMemberEntity { ServerId = server.Id, UserId = ownerGuid, JoinedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        return Created("", new { server.Id, server.Name, server.OwnerId, server.InviteCode });
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinServer([FromBody] JoinServerRequest req)
    {
        var server = await db.Servers.FirstOrDefaultAsync(s => s.InviteCode == req.InviteCode);
        if (server == null)
            return NotFound(new { error = "Invalid invite code." });

        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(callerId, out var callerGuid))
            return Unauthorized(new { error = "Invalid token." });

        if (await db.ServerMembers.AnyAsync(m => m.ServerId == server.Id && m.UserId == callerGuid))
            return Ok(new { server.Id, server.Name });

        db.ServerMembers.Add(new ServerMemberEntity { ServerId = server.Id, UserId = callerGuid, JoinedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        return Ok(new { server.Id, server.Name, server.OwnerId });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyServers()
    {
        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(callerId, out var callerGuid))
            return Unauthorized(new { error = "Invalid token." });

        var memberServerIds = await db.ServerMembers
            .Where(m => m.UserId == callerGuid)
            .Select(m => m.ServerId)
            .ToListAsync();

        var servers = await db.Servers
            .Where(s => memberServerIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Name, s.OwnerId, s.InviteCode })
            .ToListAsync();

        return Ok(servers);
    }

    [HttpGet("{id}/rooms")]
    public async Task<IActionResult> GetServerRooms(int id)
    {
        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(callerId, out var callerGuid))
            return Unauthorized(new { error = "Invalid token." });

        if (!await db.ServerMembers.AnyAsync(m => m.ServerId == id && m.UserId == callerGuid))
            return Forbid();

        var rooms = await db.Rooms
            .Where(r => r.ServerId == id)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync();

        return Ok(rooms);
    }

    [HttpPost("{id}/rooms")]
    public async Task<IActionResult> CreateServerRoom(int id, [FromBody] CreateServerRoomRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });
        if (req.Name.Trim().Length > 80)
            return BadRequest(new { error = "Room name must be 80 characters or fewer." });

        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(callerId, out var callerGuid))
            return Unauthorized(new { error = "Invalid token." });

        var server = await db.Servers.FirstOrDefaultAsync(s => s.Id == id);
        if (server == null || server.OwnerId != callerGuid)
            return Forbid();

        var room = new RoomEntity { Name = req.Name.Trim(), ServerId = id, CreatedAt = DateTime.UtcNow };
        db.Rooms.Add(room);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "A room with that name already exists in this server." });
        }

        var allRooms = await db.Rooms
            .Where(r => r.ServerId == id)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync();
        await hubContext.Clients.Group($"server-{id}").SendAsync("RoomListUpdated", allRooms);

        return Created("", new { room.Id, room.Name, room.ServerId });
    }
}

public record CreateServerRequest(string Name);
public record JoinServerRequest(string InviteCode);
public record CreateServerRoomRequest(string Name);
