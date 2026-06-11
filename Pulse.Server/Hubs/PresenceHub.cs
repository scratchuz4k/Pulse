using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Pulse.Server.Data;
using Pulse.Server.Services;

namespace Pulse.Server.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILiveKitService _liveKitService;
    private readonly IConfiguration _configuration;

    public PresenceHub(AppDbContext db, ILiveKitService liveKitService, IConfiguration configuration)
    {
        _db = db;
        _liveKitService = liveKitService;
        _configuration = configuration;
    }

    private record ParticipantInfo(string DisplayName, string UserId, bool IsMuted = false, bool IsDeafened = false, bool IsPrioritySpeaker = false);

    private record WhisperGroup(
        string GroupId,
        string Name,
        string Visibility,
        ConcurrentBag<string> MemberUserIds,
        string LiveKitRoomName
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

    // ── Admin helper ─────────────────────────────────────────────────────────

    private bool IsServerAdmin()
    {
        var callerUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? Context.User?.FindFirst("sub")?.Value;
        var adminUserId = _configuration["Pulse:AdminUserId"]
                          ?? Environment.GetEnvironmentVariable("PULSE_ADMIN_USER_ID");
        return !string.IsNullOrEmpty(callerUserId) && string.Equals(callerUserId, adminUserId, StringComparison.OrdinalIgnoreCase);
    }

    // ── Connection lifecycle ─────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("sub")?.Value ?? "";
        var displayName = Context.User?.FindFirst("displayName")?.Value ?? "Unknown";
        if (!string.IsNullOrEmpty(userId))
            _userToConnection[userId] = Context.ConnectionId;
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
        if (IsServerAdmin())
            await Clients.Caller.SendAsync("YouAreAdmin");
        var visibleGroups = BuildVisibleGroupsForUser(userId);
        await Clients.Caller.SendAsync("WhisperGroupsUpdated", visibleGroups);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? Context.User?.FindFirst("sub")?.Value ?? "";
        if (!string.IsNullOrEmpty(userId))
            _userToConnection.TryRemove(userId, out _);

        bool roomListChanged = false;
        foreach (var (roomName, room) in _rooms)
        {
            if (room.TryRemove(Context.ConnectionId, out _))
            {
                await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
                if (room.IsEmpty)
                    await DeleteRoomAndBroadcast(roomName); // already broadcasts
                else
                    roomListChanged = true;
            }
        }
        if (roomListChanged)
            await BroadcastRoomListAsync();
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
    public static IEnumerable<object> BuildRoomListPayload(IEnumerable<(int Id, string Name, Guid? CreatedByUserId)> rooms) =>
        rooms.Select(r => (object)new
        {
            id = r.Id,
            name = r.Name,
            createdByUserId = r.CreatedByUserId,
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

        await BroadcastRoomListAsync();
    }

    public async Task LeaveRoom(string roomName)
    {
        if (_rooms.TryGetValue(roomName, out var room))
        {
            room.TryRemove(Context.ConnectionId, out _);
            if (room.IsEmpty)
                await DeleteRoomAndBroadcast(roomName);
            else
                await BroadcastRoomListAsync();
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
        var callerUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? Context.User?.FindFirst("sub")?.Value;
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (room == null || room.CreatedByUserId?.ToString() != callerUserId) return;

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
        var callerUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? Context.User?.FindFirst("sub")?.Value;
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (room == null || room.CreatedByUserId?.ToString() != callerUserId) return;

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

    public async Task CreateWhisperGroup(string name, string visibility)
    {
        if (!IsServerAdmin()) return;
        if (visibility != "hidden" && visibility != "existence" && visibility != "full") return;
        var adminUserId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? Context.User?.FindFirst("sub")?.Value ?? "";
        var groupId = Guid.NewGuid().ToString("N")[..8];
        var liveKitRoomName = $"whisper-{groupId}";
        var members = new ConcurrentBag<string>();
        if (!string.IsNullOrEmpty(adminUserId)) members.Add(adminUserId);
        var group = new WhisperGroup(groupId, name, visibility, members, liveKitRoomName);
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
        if (!IsServerAdmin()) return;
        if (!_whisperGroups.TryGetValue(groupId, out var group)) return;
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
        if (!IsServerAdmin()) return;
        if (!_whisperGroups.TryGetValue(groupId, out var group)) return;
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
        if (!IsServerAdmin()) return;
        if (!_whisperGroups.TryRemove(groupId, out var group)) return;
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

    private async Task BroadcastRoomListAsync()
    {
        var allRooms = await _db.Rooms.OrderBy(r => r.Name).Select(r => new { r.Id, r.Name, r.CreatedByUserId }).ToListAsync();
        var payload = BuildRoomListPayload(allRooms.Select(r => (r.Id, r.Name, r.CreatedByUserId)));
        await Clients.All.SendAsync("RoomListUpdated", payload);
    }

    private async Task DeleteRoomAndBroadcast(string roomName)
    {
        _rooms.TryRemove(roomName, out _);
        _prioritySpeakers.TryRemove(roomName, out _);

        var dbRoom = await _db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
        if (dbRoom != null)
        {
            _db.Rooms.Remove(dbRoom);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { /* already deleted */ }
        }

        await BroadcastRoomListAsync();
    }

    private List<object> BuildVisibleGroupsForUser(string userId)
    {
        var adminUserId = _configuration["Pulse:AdminUserId"]
                          ?? Environment.GetEnvironmentVariable("PULSE_ADMIN_USER_ID");
        var isAdmin = string.Equals(userId, adminUserId, StringComparison.OrdinalIgnoreCase);
        var visibleGroups = new List<object>();
        foreach (var g in _whisperGroups.Values)
        {
            var isMember = g.MemberUserIds.Contains(userId);
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
            var visibleGroups = BuildVisibleGroupsForUser(userId);
            await Clients.Client(connId).SendAsync("WhisperGroupsUpdated", visibleGroups);
        }
    }
}
