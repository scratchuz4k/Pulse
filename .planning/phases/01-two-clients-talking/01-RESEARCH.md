# Phase 1: Two Clients Talking — Research

## RESEARCH COMPLETE

**Phase goal:** Prove the architecture — two Electron+Vue clients connect to a C# ASP.NET Core server via SignalR and establish a WebRTC P2P voice call.

---

## Stack Confirmation

### C# Server — ASP.NET Core 8 + SignalR
- **SignalR** is the proven choice for WebRTC signaling in .NET. It manages client connections, routes SDP offers/answers, and relays ICE candidates between peers. The hub pattern is a clean fit: clients call hub methods (`SendOffer`, `SendAnswer`, `SendIceCandidate`) and the hub routes them to the correct peer by connection ID.
- **Room state** lives in the hub (or a scoped service): a `Dictionary<string, HashSet<string>>` of roomName → connectionIds is sufficient for Phase 1.
- **`OnDisconnectedAsync`** fires reliably when clients drop — clean up room membership here.
- **References:** [SignalR+WebRTC example](https://github.com/Shhzdmrz/SignalRCoreWebRTC), [ekobit guide](https://ekobit.com/blog/building-a-modern-and-secure-webrtc-solution-with-microsoft-signalr-and-angular/)

### Electron + Vue 3 Client
- **Boilerplate:** Use `electron-vite/electron-vite-vue` — the simplest, most maintained template. It gives Vite HMR, Vue 3 SFCs, TypeScript, and Electron Builder out of the box. Clone with `npx create-electron-app@latest --template=vite-vue`.
- **SignalR client:** `@microsoft/signalr` npm package — exact same hub methods, typed invocations.
- **WebRTC:** Chromium's native `RTCPeerConnection` API is fully available in Electron renderer process. No additional library needed.
- **References:** [electron-vite-vue](https://github.com/electron-vite/electron-vite-vue)

### WebRTC P2P Flow (canonical sequence)
1. Client A joins room → server records connection ID
2. Client B joins room → server notifies A (sends B's connection ID)
3. A creates `RTCPeerConnection`, adds local media stream (`getUserMedia`)
4. A creates SDP offer → sends to server via SignalR → server relays to B
5. B receives offer → creates answer → relays back through server
6. Both sides exchange ICE candidates through the server
7. WebRTC DTLS handshake completes → audio flows P2P (bypasses server)
8. ICE config: `{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }`

### JWT Auth in ASP.NET Core 8
- Standard pattern: POST `/auth/register` and `/auth/login` return `{ accessToken, refreshToken }`.
- Access token: HS256 JWT, 30-minute expiry. Claims: `sub` (user GUID), `displayName`.
- Refresh token: cryptographically random (32 bytes, base64), stored in a DB table (`RefreshTokens`) alongside user ID, expiry (7 days), and revoked flag. Rotate on use (issue new refresh token, revoke old).
- **SignalR auth:** Client passes JWT as query string on SignalR connection: `?access_token=<jwt>`. ASP.NET reads it in `JwtBearerEvents.OnMessageReceived`. This is the documented pattern for SignalR auth.
- **Electron token storage:** Store refresh token in encrypted local file (`electron-store` with `encryptionKey` derived from machine ID). `keytar` is an option too but adds a native dependency. For Phase 1, `electron-store` with encryption is the simplest approach.
- **References:** [JWT+refresh ASP.NET Core](https://www.connectedprogrammer.com/web-api/jwt-authentication-in-asp-net-core-8-with-refresh-token-2025-tutorial/), [Code Maze refresh tokens](https://code-maze.com/using-refresh-tokens-in-asp-net-core-authentication/)

---

## Architecture: IAudioRouter Seam

The context decision (D-07) requires an `IAudioRouter` abstraction for future SFU plug-in. In Phase 1, the implementation is simple:

```csharp
public interface IAudioRouter
{
    Task NotifyPeerJoined(string roomId, string newConnectionId, IReadOnlyList<string> existingPeerIds);
    Task NotifyPeerLeft(string roomId, string departedConnectionId, IReadOnlyList<string> remainingPeerIds);
}

public class P2PCoordinator : IAudioRouter
{
    // Signals existing peers to initiate offer to the new peer
    // No audio touches the server — this just triggers client-side WebRTC initiation
}
```

This interface lives on the server. When Phase 3/4 arrives, swap `P2PCoordinator` with an `SfuRouter` that routes through a media server — hub code doesn't change.

---

## Project Structure

### Server (`/server` or `/Server`)
```
Pulse.Server/
  Controllers/
    AuthController.cs        # /auth/register, /auth/login, /auth/refresh
  Hubs/
    VoiceHub.cs              # SignalR hub — signaling methods
  Services/
    IAudioRouter.cs          # Abstraction seam
    P2PCoordinator.cs        # Phase 1 implementation
    RoomService.cs           # Room state management
    TokenService.cs          # JWT issue/validate/refresh
  Models/
    User.cs
    RefreshToken.cs
    Room.cs
  Data/
    AppDbContext.cs           # EF Core — SQLite for Phase 1
  Program.cs
```

### Client (`/client`)
```
pulse-client/               # electron-vite-vue scaffold
  src/
    main/
      index.ts               # Electron main process
    preload/
      index.ts               # Context bridge (expose IPC to renderer)
    renderer/
      App.vue
      views/
        LoginView.vue
        RoomView.vue
      composables/
        useSignalR.ts        # SignalR connection management
        useWebRTC.ts         # RTCPeerConnection lifecycle
        useAuth.ts           # Token storage + refresh
      stores/
        auth.ts              # Pinia store
        room.ts              # Room/peer state
```

---

## Pitfalls

1. **SignalR JWT on WebSocket upgrade:** The `access_token` query param approach requires explicit handler in `JwtBearerEvents.OnMessageReceived` — do not skip this or SignalR hub will be unauthorized.
2. **ICE candidate timing:** Clients must buffer ICE candidates received before `setRemoteDescription` completes and apply them after. Common bug: dropping early candidates.
3. **Multiple simultaneous joiners:** If two clients join simultaneously, both trigger "notify existing peers" — handle the case where A sends offer to B and B simultaneously sends offer to A (duplicate offers). Use a consistent tiebreaker: whichever `connectionId` is lexicographically first is the "caller".
4. **getUserMedia in Electron:** Electron renderer has microphone access by default on Windows, but may require `session.setPermissionRequestHandler` in the main process if issues arise. Test early.
5. **CORS + SignalR:** SignalR needs explicit CORS policy including `AllowCredentials()` and the specific Electron origin (or `AllowAnyOrigin` for dev). Production should lock this down.
6. **electron-store encryption:** Requires a stable encryption key. Derive from `machineId` (using `node-machine-id` package) so the key survives app restarts but is machine-specific.
7. **EF Core SQLite on Windows:** SQLite in EF Core requires the `Microsoft.EntityFrameworkCore.Sqlite` package. For dev, keep the DB file in the project root or `%APPDATA%`. Do not commit it.

---

## Walking Skeleton Definition

The Phase 1 walking skeleton proves: **register → login → join room → hear another person**.

Thinnest end-to-end slice:
- Server: one endpoint for auth + one SignalR hub that routes offers/answers/ICE
- Client: login screen → room screen → mic button → hear audio from the other peer
- No styling required — functional only
- SQLite in-memory or file-based (no migration complexity)

This slice validates the entire technical architecture in one pass.
