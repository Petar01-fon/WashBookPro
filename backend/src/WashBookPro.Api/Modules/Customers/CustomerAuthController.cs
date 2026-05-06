using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Customers.Dtos;
using WashBookPro.Api.Modules.Customers.Entities;

namespace WashBookPro.Api.Modules.Customers;

[ApiController]
[Route("auth/customer")]
public class CustomerAuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    // POST /auth/customer/register
    [HttpPost("register")]
    public async Task<IActionResult> Register(CustomerRegisterRequest request)
    {
        var exists = await db.CustomerAccounts.AnyAsync(c => c.Email == request.Email);
        if (exists)
            return Conflict(new { error = "Email already registered." });

        var refreshToken = Guid.NewGuid().ToString();

        var customer = new CustomerAccount
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.CustomerAccounts.Add(customer);
        await db.SaveChangesAsync();

        var (accessToken, expiresAt) = GenerateAccessToken(customer);
        return Ok(new CustomerAuthResponse(accessToken, refreshToken, expiresAt));
    }

    // POST /auth/customer/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(CustomerLoginRequest request)
    {
        var customer = await db.CustomerAccounts.SingleOrDefaultAsync(c => c.Email == request.Email);

        if (customer is null || customer.PasswordHash is null ||
            !BCrypt.Net.BCrypt.Verify(request.Password, customer.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials." });

        var refreshToken = Guid.NewGuid().ToString();
        customer.RefreshToken = refreshToken;
        customer.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(30);
        await db.SaveChangesAsync();

        var (accessToken, expiresAt) = GenerateAccessToken(customer);
        return Ok(new CustomerAuthResponse(accessToken, refreshToken, expiresAt));
    }

    // POST /auth/customer/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CustomerRefreshRequest request)
    {
        var customer = await db.CustomerAccounts
            .SingleOrDefaultAsync(c => c.RefreshToken == request.RefreshToken);

        if (customer is null || customer.RefreshTokenExpiresAt < DateTimeOffset.UtcNow)
            return Unauthorized(new { error = "Invalid or expired refresh token." });

        var refreshToken = Guid.NewGuid().ToString();
        customer.RefreshToken = refreshToken;
        customer.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(30);
        await db.SaveChangesAsync();

        var (accessToken, expiresAt) = GenerateAccessToken(customer);
        return Ok(new CustomerAuthResponse(accessToken, refreshToken, expiresAt));
    }

    // GET /auth/google
    [HttpGet("/auth/google")]
    public IActionResult GoogleLogin()
    {
        var props = new AuthenticationProperties { RedirectUri = "/auth/google/complete" };
        return Challenge(props, GoogleDefaults.AuthenticationScheme);
    }

    // GET /auth/google/complete  (after Google middleware handles /auth/google/callback)
    [HttpGet("/auth/google/complete")]
    public async Task<IActionResult> GoogleComplete()
    {
        var result = await HttpContext.AuthenticateAsync("ExternalCookie");
        if (!result.Succeeded)
            return Unauthorized(new { error = "Google authentication failed." });

        var email = result.Principal!.FindFirstValue(ClaimTypes.Email);
        var googleId = result.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var firstName = result.Principal.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty;
        var lastName = result.Principal.FindFirstValue(ClaimTypes.Surname) ?? string.Empty;

        if (email is null || googleId is null)
            return Unauthorized(new { error = "Google did not return required claims." });

        var customer = await db.CustomerAccounts.SingleOrDefaultAsync(c => c.Email == email);

        if (customer is null)
        {
            customer = new CustomerAccount
            {
                Id = Guid.NewGuid(),
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                PhoneNumber = string.Empty,
                GoogleId = googleId,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.CustomerAccounts.Add(customer);
        }
        else if (customer.GoogleId is null)
        {
            customer.GoogleId = googleId;
        }

        var refreshToken = Guid.NewGuid().ToString();
        customer.RefreshToken = refreshToken;
        customer.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(30);
        await db.SaveChangesAsync();

        await HttpContext.SignOutAsync("ExternalCookie");

        var (accessToken, expiresAt) = GenerateAccessToken(customer);

        var frontendBase = config["Frontend:BaseUrl"] ?? "http://localhost:3000";
        return Redirect($"{frontendBase}/auth/callback?token={Uri.EscapeDataString(accessToken)}&refresh={Uri.EscapeDataString(refreshToken)}");
    }

    // GET /auth/customer/me
    [HttpGet("me")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMe()
    {
        var customerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var customer = await db.CustomerAccounts.FindAsync(customerId);
        if (customer is null) return NotFound();

        return Ok(new CustomerResponse(
            customer.Id, customer.FirstName, customer.LastName,
            customer.Email, customer.PhoneNumber));
    }

    // PUT /auth/customer/me
    [HttpPut("me")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> UpdateMe(UpdateCustomerRequest request)
    {
        var customerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var customer = await db.CustomerAccounts.FindAsync(customerId);
        if (customer is null) return NotFound();

        if (request.FirstName is not null) customer.FirstName = request.FirstName;
        if (request.LastName is not null) customer.LastName = request.LastName;
        if (request.PhoneNumber is not null) customer.PhoneNumber = request.PhoneNumber;

        await db.SaveChangesAsync();

        return Ok(new CustomerResponse(
            customer.Id, customer.FirstName, customer.LastName,
            customer.Email, customer.PhoneNumber));
    }

    private (string token, DateTimeOffset expiresAt) GenerateAccessToken(CustomerAccount customer)
    {
        var secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(15);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, customer.Id.ToString()),
            new Claim(ClaimTypes.Role, "Customer"),
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
