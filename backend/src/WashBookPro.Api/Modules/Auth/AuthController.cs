using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WashBookPro.Api.Common.Extensions;
using WashBookPro.Api.Modules.Auth.Dtos;
using WashBookPro.Api.Modules.Auth.Services;

namespace WashBookPro.Api.Modules.Auth;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting(RateLimitingExtensions.LoginPolicy)]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var response = await authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request)
    {
        try
        {
            var response = await authService.RefreshAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}
