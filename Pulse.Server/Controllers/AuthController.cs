using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulse.Server.Data;
using Pulse.Server.Models;
using Pulse.Server.Services;

namespace Pulse.Server.Controllers;

[ApiController]
[Route("auth")]
[AllowAnonymous]
public class AuthController(AppDbContext db, ITokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "DisplayName and Password are required." });

        var exists = await db.Users.AnyAsync(u => u.DisplayName == request.DisplayName, ct);
        if (exists)
            return BadRequest(new { error = "DisplayName already taken." });

        var user = new User
        {
            DisplayName = request.DisplayName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = await tokenService.GenerateRefreshTokenAsync(user.Id, ct);

        return Ok(new
        {
            accessToken,
            refreshToken,
            userId = user.Id,
            displayName = user.DisplayName
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "DisplayName and Password are required." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.DisplayName == request.DisplayName, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials." });

        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = await tokenService.GenerateRefreshTokenAsync(user.Id, ct);

        return Ok(new
        {
            accessToken,
            refreshToken,
            userId = user.Id,
            displayName = user.DisplayName
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { error = "RefreshToken is required." });

        var user = await tokenService.ValidateRefreshTokenAsync(request.RefreshToken, ct);
        if (user is null)
            return Unauthorized(new { error = "Invalid or expired refresh token." });

        var accessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = await tokenService.GenerateRefreshTokenAsync(user.Id, ct);

        return Ok(new { accessToken, refreshToken = newRefreshToken });
    }
}

public record RegisterRequest(string DisplayName, string Password);
public record LoginRequest(string DisplayName, string Password);
public record RefreshRequest(string RefreshToken);
