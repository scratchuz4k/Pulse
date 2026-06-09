namespace Pulse.Server.Services;

public interface ILiveKitService
{
    string GenerateRoomToken(string roomName, string participantIdentity, string participantName);
    string GetLiveKitHost();
}
