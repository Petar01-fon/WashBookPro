using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Dtos;
using WashBookPro.Api.Modules.Auth.Entities;

namespace WashBookPro.Api.Modules.Auth.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var exists = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == request.TenantId && u.Email == request.Email);

        if (exists)
            throw new InvalidOperationException("Email already registered for this tenant.");

        var refreshToken = Guid.NewGuid().ToString();
        var refreshExpiresAt = DateTimeOffset.UtcNow.AddDays(7);

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = request.TenantId,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = refreshExpiresAt,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var (accessToken, expiresAt) = GenerateAccessToken(user);
        return new AuthResponse(accessToken, refreshToken, expiresAt, string.Empty);
    }

  public async Task<AuthResponse> LoginAsync(LoginRequest request)
{
    var user = await db.Users
        .IgnoreQueryFilters()
        .SingleOrDefaultAsync(u => u.Email == request.Email);

    if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        throw new UnauthorizedAccessException("Invalid credentials.");

    var tenant = await db.Tenants
        .IgnoreQueryFilters()
        .SingleOrDefaultAsync(t => t.Id == user.TenantId);

    var refreshToken = Guid.NewGuid().ToString();
    user.RefreshToken = refreshToken;
    user.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(7);
    await db.SaveChangesAsync();

    var (accessToken, expiresAt) = GenerateAccessToken(user);
    return new AuthResponse(accessToken, refreshToken, expiresAt, tenant?.Slug ?? string.Empty);
}

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request)
    {
        var user = await db.Users
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);

        if (user is null || user.RefreshTokenExpiresAt < DateTimeOffset.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        var refreshToken = Guid.NewGuid().ToString();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(7);
        await db.SaveChangesAsync();

        var (accessToken, expiresAt) = GenerateAccessToken(user);
        return new AuthResponse(accessToken, refreshToken, expiresAt, string.Empty);
    }

    private (string token, DateTimeOffset expiresAt) GenerateAccessToken(User user)
    {
        var secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(15);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("tenant_id", user.TenantId.ToString()),
            new Claim(ClaimTypes.Role, user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
