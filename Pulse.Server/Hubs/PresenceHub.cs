using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Pulse.Server.Data;
using Pulse.Server.Services;

namespace Pulse.Server.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILiveKitService _liveKitService;

    public PresenceHub(AppDbContext db, ILiveKitService liveKitService)
    {
        _db = db;
        _liveKitService = liveKitService;
    }

    private record ParticipantInfo(string DisplayName, string UserId, bool IsMuted = false, bool IsDeafened = false, bool IsPrioritySpeaker = false);

    private record WhisperGroup(
        string GroupId,
        string Name,
        string Visibility,
        ConcurrentBag<string> MemberUserIds,
        string LiveKitRoomName,
        int ServerId
    );

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, ParticipantInfo>>
        _rooms = new(); // roomName -> { connectionId -> ParticipantInfo }

    private static readonly ConcurrentDictionary<string, string>
        _connectionToRoom = new(); // connectionId -> roomName

    private static readonly ConcurrentDictionary<string, string>
        _prioritySpeakers = new(); // roomName -> userId

    private static readonly ConcurrentDictionary<string, WhisperGroup>
        _whisperGroups = new();

    private static readonly ConcurrentDictionary<string, ConcurrentBag<string>>
        _userToWhisperGroups = new();

    private static readonly ConcurrentDictionary<string, string>
        _userToConnection = new();

    private record ConnectedUser(string UserId, string DisplayName);

    private static readonly ConcurrentDictionary<string, ConnectedUser>
        _connectedUsers = new(); // userId -> ConnectedUser

    // ── Admin helper ─────────────────────────────────────────────────────────

    private async Task<bool> IsOwnerOfServer(int serverId)
    {
        var callerUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? Context.User?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(callerUserId)) return false;
        return await _db.Servers.AnyAsync(s => s.Id == serverId && s.OwnerId.ToString() == callerUserId);
    }

    // ── Connection lifecycle ─────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("sub")?.Value ?? "";
        var displayName = Context.User?.FindFirst("displayName")?.Value ?? "Unknown";
        if (!string.IsNullOrEmpty(userId))
        {
            _userToConnection[userId] = Context.ConnectionId;
            _connectedUsers[userId] = new ConnectedUser(userId, displayName);
        }
        var memberGroups = _whisperGroups.Values
            .Where(g => g.MemberUserIds.Contains(userId))
            .ToList();
        if (memberGroups.Count > 0)
        {
            var tokens = memberGroups.Select(g => new
            {
                groupId = g.GroupId,
                groupName = g.Name,
                liveKitToken = _liveKitService.GenerateRoomToken(g.LiveKitRoomName, userId, displayName),
                liveKitHost = _liveKitService.GetLiveKitHost()
            }).ToList();
            await Clients.Caller.SendAsync("JoinWhisperGroups", tokens);
        }

        // Subscribe connection to all servers the user belongs to
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            var serverIds = await _db.ServerMembers
                .Where(m => m.UserId == userGuid)
                .Select(m => m.ServerId)
                .ToListAsync();
            foreach (var sid in serverIds)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"server-{sid}");
        }

        var visibleGroups = await BuildVisibleGroupsForUser(userId);
        await Clients.Caller.SendAsync("WhisperGroupsUpdated", visibleGroups);
        await Clients.Caller.SendAsync("UsersUpdated", BuildUsersPayload());
        await Clients.Others.SendAsync("UsersUpdated", BuildUsersPayload());
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("sub")?.Value ?? "";
        if (!string.IsNullOrEmpty(userId))
        {
            _userToConnection.TryRemove(userId, out _);
            _connectedUsers.TryRemove(userId, out _);
            await Clients.Others.SendAsync("UsersUpdated", BuildUsersPayload());
        }

        bool roomListChanged = false;
        string? changedRoomServerId = null;
        foreach (var (roomName, room) in _rooms)
        {
            if (room.TryRemove(Context.ConnectionId, out _))
            {
                await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
                if (room.IsEmpty)
                    await DeleteRoomAndBroadcast(roomName);
                else
                {
                    roomListChanged = true;
                    // Track the room's server for scoped broadcast
                    var dbRoom = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
                    if (dbRoom != null) changedRoomServerId = dbRoom.ServerId.ToString();
                }
            }
        }
        if (roomListChanged && changedRoomServerId != null && int.TryParse(changedRoomServerId, out var sid))
            await BroadcastRoomListAsync(sid);
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        await base.OnDisconnectedAsync(exception);
    }

    // ── Room methods ─────────────────────────────────────────────────────────

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
        if (_prioritySpeakers.TryGetValue(roomName, out var ps))
            await Clients.Caller.SendAsync("PrioritySpeakerChanged", ps);

        var dbRoom = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (dbRoom != null) await BroadcastRoomListAsync(dbRoom.ServerId);
    }

    public async Task LeaveRoom(string roomName)
    {
        if (_rooms.TryGetValue(roomName, out var room))
        {
            room.TryRemove(Context.ConnectionId, out _);
            if (room.IsEmpty)
                await DeleteRoomAndBroadcast(roomName);
            else
            {
                var dbRoom = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
                if (dbRoom != null) await BroadcastRoomListAsync(dbRoom.ServerId);
            }
        }
        _connectionToRoom.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
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

    public async Task AssignPrioritySpeaker(string roomName, string targetUserId)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (room == null) return;
        if (!await IsOwnerOfServer(room.ServerId)) return;

        _prioritySpeakers[roomName] = targetUserId;

        if (_rooms.TryGetValue(roomName, out var participants))
        {
            foreach (var key in participants.Keys.ToList())
            {
                var p = participants[key];
                participants[key] = p with { IsPrioritySpeaker = p.UserId == targetUserId };
            }
        }

        await Clients.Group(roomName).SendAsync("PrioritySpeakerChanged", targetUserId);
    }

    public async Task RemovePrioritySpeaker(string roomName)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (room == null) return;
        if (!await IsOwnerOfServer(room.ServerId)) return;

        _prioritySpeakers.TryRemove(roomName, out _);

        if (_rooms.TryGetValue(roomName, out var participants))
        {
            foreach (var key in participants.Keys.ToList())
            {
                var p = participants[key];
                participants[key] = p with { IsPrioritySpeaker = false };
            }
        }

        await Clients.Group(roomName).SendAsync("PrioritySpeakerChanged", (string?)null);
    }

    // ── Whisper group methods ────────────────────────────────────────────────

    public async Task CreateWhisperGroup(int serverId, string name, string visibility)
    {
        if (!await IsOwnerOfServer(serverId)) return;
        if (visibility != "hidden" && visibility != "existence" && visibility != "full") return;
        var adminUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? Context.User?.FindFirst("sub")?.Value ?? "";
        var groupId = Guid.NewGuid().ToString("N")[..8];
        var liveKitRoomName = $"whisper-{groupId}";
        var members = new ConcurrentBag<string>();
        if (!string.IsNullOrEmpty(adminUserId)) members.Add(adminUserId);
        var group = new WhisperGroup(groupId, name, visibility, members, liveKitRoomName, serverId);
        _whisperGroups[groupId] = group;
        if (!string.IsNullOrEmpty(adminUserId))
            _userToWhisperGroups.GetOrAdd(adminUserId, _ => new()).Add(groupId);
        await BroadcastWhisperGroupsAsync();
        if (!string.IsNullOrEmpty(adminUserId) && _userToConnection.TryGetValue(adminUserId, out var adminConnId))
        {
            var token = _liveKitService.GenerateRoomToken(liveKitRoomName, adminUserId, adminUserId);
            await Clients.Client(adminConnId).SendAsync("WhisperGroupMemberAdded", new
            {
                groupId,
                groupName = name,
                liveKitToken = token,
                liveKitHost = _liveKitService.GetLiveKitHost()
            });
        }
    }

    public async Task AddWhisperMember(string groupId, string targetUserId)
    {
        if (!_whisperGroups.TryGetValue(groupId, out var group)) return;
        if (!await IsOwnerOfServer(group.ServerId)) return;
        if (group.MemberUserIds.Contains(targetUserId)) return;
        group.MemberUserIds.Add(targetUserId);
        _userToWhisperGroups.GetOrAdd(targetUserId, _ => new()).Add(groupId);
        await BroadcastWhisperGroupsAsync();
        if (_userToConnection.TryGetValue(targetUserId, out var connId))
        {
            var token = _liveKitService.GenerateRoomToken(group.LiveKitRoomName, targetUserId, targetUserId);
            await Clients.Client(connId).SendAsync("WhisperGroupMemberAdded", new
            {
                groupId,
                groupName = group.Name,
                liveKitToken = token,
                liveKitHost = _liveKitService.GetLiveKitHost()
            });
        }
    }

    public async Task RemoveWhisperMember(string groupId, string targetUserId)
    {
        if (!_whisperGroups.TryGetValue(groupId, out var group)) return;
        if (!await IsOwnerOfServer(group.ServerId)) return;
        var updated = group with { MemberUserIds = new ConcurrentBag<string>(group.MemberUserIds.Where(id => id != targetUserId)) };
        _whisperGroups[groupId] = updated;
        if (_userToWhisperGroups.TryGetValue(targetUserId, out var userGroups))
            _userToWhisperGroups[targetUserId] = new ConcurrentBag<string>(userGroups.Where(id => id != groupId));
        await BroadcastWhisperGroupsAsync();
        if (_userToConnection.TryGetValue(targetUserId, out var connId))
            await Clients.Client(connId).SendAsync("WhisperGroupMemberRemoved", new { groupId });
    }

    public async Task DissolveWhisperGroup(string groupId)
    {
        if (!_whisperGroups.TryRemove(groupId, out var group)) return;
        if (!await IsOwnerOfServer(group.ServerId)) return;
        foreach (var memberId in group.MemberUserIds)
        {
            if (_userToWhisperGroups.TryGetValue(memberId, out var userGroups))
                _userToWhisperGroups[memberId] = new ConcurrentBag<string>(userGroups.Where(id => id != groupId));
            if (_userToConnection.TryGetValue(memberId, out var connId))
                await Clients.Client(connId).SendAsync("WhisperGroupDissolved", new { groupId });
        }
        await BroadcastWhisperGroupsAsync();
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private static string? GetRoomForConnection(string connectionId) =>
        _connectionToRoom.TryGetValue(connectionId, out var r) ? r : null;

    private static IEnumerable<object> BuildUsersPayload() =>
        _connectedUsers.Values.Select(u => (object)new { userId = u.UserId, displayName = u.DisplayName });

    private async Task BroadcastRoomListAsync(int serverId)
    {
        var allRooms = await _db.Rooms
            .Where(r => r.ServerId == serverId)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync();
        var payload = BuildRoomListPayload(allRooms.Select(r => (r.Id, r.Name)));
        await Clients.Group($"server-{serverId}").SendAsync("RoomListUpdated", payload);
    }

    private async Task DeleteRoomAndBroadcast(string roomName)
    {
        _rooms.TryRemove(roomName, out _);
        _prioritySpeakers.TryRemove(roomName, out _);

        var dbRoom = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        int serverId = dbRoom?.ServerId ?? 0;
        if (dbRoom != null)
        {
            _db.Rooms.Remove(dbRoom);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { /* already deleted */ }
        }

        if (serverId != 0)
            await BroadcastRoomListAsync(serverId);
    }

    private async Task<List<object>> BuildVisibleGroupsForUser(string userId)
    {
        var ownedServerIds = new HashSet<int>();
        if (Guid.TryParse(userId, out var userGuid))
            ownedServerIds = (await _db.Servers
                .Where(s => s.OwnerId == userGuid)
                .Select(s => s.Id)
                .ToListAsync()).ToHashSet();

        var visibleGroups = new List<object>();
        foreach (var g in _whisperGroups.Values)
        {
            var isMember = g.MemberUserIds.Contains(userId);
            var isAdmin = ownedServerIds.Contains(g.ServerId);
            if (g.Visibility == "hidden" && !isMember && !isAdmin) continue;
            if (isMember || isAdmin)
            {
                visibleGroups.Add(new
                {
                    groupId = g.GroupId,
                    name = g.Name,
                    visibility = g.Visibility,
                    isMember,
                    memberUserIds = g.MemberUserIds.ToArray()
                });
            }
            else if (g.Visibility == "existence")
            {
                visibleGroups.Add(new
                {
                    groupId = g.GroupId,
                    name = g.Name,
                    visibility = g.Visibility,
                    isMember = false,
                    memberCount = g.MemberUserIds.Count
                });
            }
            else // full
            {
                visibleGroups.Add(new
                {
                    groupId = g.GroupId,
                    name = g.Name,
                    visibility = g.Visibility,
                    isMember = false,
                    memberUserIds = g.MemberUserIds.ToArray()
                });
            }
        }
        return visibleGroups;
    }

    private async Task BroadcastWhisperGroupsAsync()
    {
        foreach (var (userId, connId) in _userToConnection)
        {
            var visibleGroups = await BuildVisibleGroupsForUser(userId);
            await Clients.Client(connId).SendAsync("WhisperGroupsUpdated", visibleGroups);
        }
    }
}
