using WashBookPro.Api.Modules.Auth.Dtos;

namespace WashBookPro.Api.Modules.Auth.Services;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshAsync(RefreshRequest request);
}
