using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Pulse.Server.Data;
using Pulse.Server.Hubs;
using Pulse.Server.Models;
using Pulse.Server.Services;

namespace Pulse.Server.Controllers;

[ApiController]
[Route("rooms")]
[Authorize]
public class RoomsController(ILiveKitService liveKitService, AppDbContext db, IHubContext<PresenceHub> hubContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await db.Rooms
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.CreatedByUserId })
            .ToListAsync();
        var payload = PresenceHub.BuildRoomListPayload(rooms.Select(r => (r.Id, r.Name, r.CreatedByUserId)));
        return Ok(payload);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        if (req.Name.Trim().Length > 80)
            return BadRequest(new { error = "Room name must be 80 characters or fewer." });

        var creatorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;
        _ = Guid.TryParse(creatorId, out var creatorGuid);

        var room = new Room { Name = req.Name.Trim(), CreatedAt = DateTime.UtcNow, CreatedByUserId = creatorGuid };
        db.Rooms.Add(room);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "A room with that name already exists." });
        }

        var rooms = await db.Rooms
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.CreatedByUserId })
            .ToListAsync();

        var payload = PresenceHub.BuildRoomListPayload(rooms.Select(r => (r.Id, r.Name, r.CreatedByUserId)));
        await hubContext.Clients.All.SendAsync("RoomListUpdated", payload);

        return Created("", new { room.Id, room.Name });
    }

    [HttpPost("token")]
    public IActionResult GetRoomToken([FromQuery] string? roomName)
    {
        if (string.IsNullOrWhiteSpace(roomName))
            return BadRequest(new { error = "roomName query parameter is required." });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value;
        var displayName = User.FindFirst("displayName")?.Value ?? "Unknown";

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Invalid token: missing sub claim." });

        var liveKitToken = liveKitService.GenerateRoomToken(roomName, userId, displayName);
        var liveKitHost = liveKitService.GetLiveKitHost();

        return Ok(new { liveKitToken, liveKitHost });
    }
}

public record CreateRoomRequest(string Name);
