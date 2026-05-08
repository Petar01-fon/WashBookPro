namespace WashBookPro.Api.Modules.Customers.Dtos;

public record CustomerRegisterRequest(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string Password);

public record CustomerLoginRequest(string Email, string Password);

public record CustomerRefreshRequest(string RefreshToken);

public record UpdateCustomerRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber);

public record CustomerResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber);

public record CustomerAuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt);

public record ChangeEmailRequest(string NewEmail, string CurrentPassword);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
