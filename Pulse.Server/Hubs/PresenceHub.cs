using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Pulse.Server.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>>
        _rooms = new(); // roomName -> { connectionId -> displayName }

    public async Task JoinRoom(string roomName)
    {
        var displayName = Context.User?.FindFirst("displayName")?.Value ?? "Unknown";
        _rooms.GetOrAdd(roomName, _ => new()).TryAdd(Context.ConnectionId, displayName);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("ParticipantJoined", Context.ConnectionId, displayName);
        var participants = _rooms.GetValueOrDefault(roomName, new())
            .Select(kv => new { connectionId = kv.Key, displayName = kv.Value });
        await Clients.Caller.SendAsync("RoomJoined", roomName, participants);
    }

    public async Task LeaveRoom(string roomName)
    {
        if (_rooms.TryGetValue(roomName, out var room))
            room.TryRemove(Context.ConnectionId, out _);
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
        await base.OnDisconnectedAsync(exception);
    }
}
