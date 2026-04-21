namespace WashBookPro.Api.Modules.Auth.Dtos;

public record RegisterRequest(string Email, string Password, string Role, Guid TenantId);
