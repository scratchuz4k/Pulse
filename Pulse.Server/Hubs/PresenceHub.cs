using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Pulse.Server.Data;

namespace Pulse.Server.Hubs;

[Authorize]
public class PresenceHub(AppDbContext db) : Hub
{
    private record ParticipantInfo(string DisplayName, string UserId, bool IsMuted = false, bool IsDeafened = false);

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, ParticipantInfo>>
        _rooms = new(); // roomName -> { connectionId -> ParticipantInfo }

    private static readonly ConcurrentDictionary<string, string>
        _connectionToRoom = new(); // connectionId -> roomName

    /// <summary>Returns a lightweight participant list for the given room.</summary>
    public static IEnumerable<object> GetRoomParticipants(string roomName)
    {
        if (!_rooms.TryGetValue(roomName, out var room))
            return Enumerable.Empty<object>();
        return room.Values.Select(p => (object)new { displayName = p.DisplayName, userId = p.UserId });
    }

    /// <summary>Builds the enriched room list payload used in RoomListUpdated broadcasts.</summary>
    public static IEnumerable<object> BuildRoomListPayload(IEnumerable<(int Id, string Name)> rooms) =>
        rooms.Select(r => (object)new
        {
            id = r.Id,
            name = r.Name,
            participants = GetRoomParticipants(r.Name)
        });

    public async Task JoinRoom(string roomName)
    {
        var displayName = Context.User?.FindFirst("displayName")?.Value ?? "Unknown";
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("sub")?.Value ?? "";
        _rooms.GetOrAdd(roomName, _ => new()).TryAdd(Context.ConnectionId, new ParticipantInfo(displayName, userId));
        _connectionToRoom[Context.ConnectionId] = roomName;
        await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("ParticipantJoined", Context.ConnectionId, displayName, userId);
        var participants = _rooms.GetValueOrDefault(roomName, new())
            .Select(kv => new { connectionId = kv.Key, displayName = kv.Value.DisplayName, userId = kv.Value.UserId });
        await Clients.Caller.SendAsync("RoomJoined", roomName, participants);

        var allRooms = await db.Rooms.OrderBy(r => r.Name).Select(r => new { r.Id, r.Name }).ToListAsync();
        var payload = BuildRoomListPayload(allRooms.Select(r => (r.Id, r.Name)));
        await Clients.All.SendAsync("RoomListUpdated", payload);
    }

    public async Task LeaveRoom(string roomName)
    {
        if (_rooms.TryGetValue(roomName, out var room))
        {
            room.TryRemove(Context.ConnectionId, out _);
            if (room.IsEmpty)
                await DeleteRoomAndBroadcast(roomName);
        }
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var (roomName, room) in _rooms)
        {
            if (room.TryRemove(Context.ConnectionId, out _))
            {
                await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
                if (room.IsEmpty)
                    await DeleteRoomAndBroadcast(roomName);
            }
        }
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task MuteChanged(bool isMuted)
    {
        var roomName = GetRoomForConnection(Context.ConnectionId);
        if (roomName is null) return;
        if (_rooms.TryGetValue(roomName, out var room) &&
            room.TryGetValue(Context.ConnectionId, out var info))
        {
            room[Context.ConnectionId] = info with { IsMuted = isMuted };
        }
        var eventName = isMuted ? "ParticipantMuted" : "ParticipantUnmuted";
        await Clients.Group(roomName).SendAsync(eventName, Context.ConnectionId);
    }

    public async Task DeafenChanged(bool isDeafened)
    {
        var roomName = GetRoomForConnection(Context.ConnectionId);
        if (roomName is null) return;
        if (_rooms.TryGetValue(roomName, out var room) &&
            room.TryGetValue(Context.ConnectionId, out var info))
        {
            room[Context.ConnectionId] = info with { IsDeafened = isDeafened };
        }
        var eventName = isDeafened ? "ParticipantDeafened" : "ParticipantUndeafened";
        await Clients.Group(roomName).SendAsync(eventName, Context.ConnectionId);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private static string? GetRoomForConnection(string connectionId) =>
        _connectionToRoom.TryGetValue(connectionId, out var r) ? r : null;

    /// <summary>
    /// Removes the empty room from the in-memory map, deletes it from the DB (if present),
    /// then broadcasts an enriched RoomListUpdated to all clients.
    /// </summary>
    private async Task DeleteRoomAndBroadcast(string roomName)
    {
        _rooms.TryRemove(roomName, out _);

        var dbRoom = await db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (dbRoom != null)
        {
            db.Rooms.Remove(dbRoom);
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { /* already deleted by a concurrent request */ }
        }

        var remainingRooms = await db.Rooms
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync();

        var payload = BuildRoomListPayload(remainingRooms.Select(r => (r.Id, r.Name)));
        await Clients.All.SendAsync("RoomListUpdated", payload);
    }
}
