namespace WashBookPro.Api.Modules.Auth.Dtos;

public record LoginRequest(string Email, string Password, Guid TenantId);
