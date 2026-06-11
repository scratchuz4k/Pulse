using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulse.Server.Services;

namespace Pulse.Server.Controllers;

[ApiController]
[Route("rooms")]
[Authorize]
public class RoomsController(ILiveKitService liveKitService) : ControllerBase
{
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
