namespace WashBookPro.Api.Modules.Auth.Dtos;

public record AuthResponse(string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt, string TenantSlug);
