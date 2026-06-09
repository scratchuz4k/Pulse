using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Pulse.Server.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private record ParticipantInfo(string DisplayName, string UserId, bool IsMuted = false);

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, ParticipantInfo>>
        _rooms = new(); // roomName -> { connectionId -> ParticipantInfo }

    private static readonly ConcurrentDictionary<string, string>
        _connectionToRoom = new(); // connectionId -> roomName

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
    }

    public async Task LeaveRoom(string roomName)
    {
        if (_rooms.TryGetValue(roomName, out var room))
            room.TryRemove(Context.ConnectionId, out _);
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var (roomName, room) in _rooms)
        {
            if (room.TryRemove(Context.ConnectionId, out _))
                await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
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

    private static string? GetRoomForConnection(string connectionId) =>
        _connectionToRoom.TryGetValue(connectionId, out var r) ? r : null;
}
