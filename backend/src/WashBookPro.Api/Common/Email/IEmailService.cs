namespace WashBookPro.Api.Common.Email;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(
        string toEmail,
        string customerName,
        string serviceName,
        DateOnly date,
        string timeSlot,
        CancellationToken cancellationToken = default);
}