using Livekit.Server.Sdk.Dotnet;

namespace Pulse.Server.Services;

public class LiveKitService(IConfiguration configuration) : ILiveKitService
{
    public string GenerateRoomToken(string roomName, string participantIdentity, string participantName)
    {
        var apiKey = configuration["LiveKit:ApiKey"]!;
        var apiSecret = configuration["LiveKit:ApiSecret"]!;

        var token = new AccessToken(apiKey, apiSecret)
            .WithIdentity(participantIdentity)
            .WithName(participantName)
            .WithGrants(new VideoGrants { RoomJoin = true, Room = roomName })
            .WithTtl(TimeSpan.FromHours(1))
            .ToJwt();

        return token;
    }

    public string GetLiveKitHost()
    {
        return configuration["LiveKit:Host"]!;
    }
}
