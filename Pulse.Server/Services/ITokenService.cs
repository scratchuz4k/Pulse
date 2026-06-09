using Pulse.Server.Models;

namespace Pulse.Server.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    Task<string> GenerateRefreshTokenAsync(Guid userId, CancellationToken ct = default);
    Task<User?> ValidateRefreshTokenAsync(string token, CancellationToken ct = default);
}
