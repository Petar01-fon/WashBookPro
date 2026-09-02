namespace WashBookPro.Api.Common.Email;

// StartsAtBelgrade is already converted from the stored UTC instant (see
// CreateReservationCoreAsync) — the email layer formats it, it does not convert
// it again. TenantAddress/TenantPhone/PlateNumber are nullable because the email
// template omits their rows entirely when absent, rather than showing a blank or
// "—" — see ResendEmailService's row-building.
public record BookingConfirmationEmail(
    string ToEmail,
    string CustomerName,
    string ServiceName,
    decimal PriceRsd,
    string? PlateNumber,
    DateTime StartsAtBelgrade,
    string TenantName,
    string? TenantAddress,
    string? TenantPhone);

public interface IEmailService
{
    Task SendBookingConfirmationAsync(
        BookingConfirmationEmail email,
        CancellationToken cancellationToken = default);
}