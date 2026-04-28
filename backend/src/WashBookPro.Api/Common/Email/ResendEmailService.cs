using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace WashBookPro.Api.Common.Email;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _http;
    private readonly string _fromEmail;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ResendEmailService> logger)
    {
        _http = httpClientFactory.CreateClient("Resend");
        _fromEmail = configuration["Resend:FromEmail"] ?? "noreply@washbookpro.rs";
        _logger = logger;
    }
    public async Task SendBookingConfirmationAsync(
        string toEmail,
        string customerName,
        string serviceName,
        DateOnly date,
        string timeSlot,
        CancellationToken cancellationToken = default)
    {
        var body = new
        {
            from = _fromEmail,
            to = new[] { toEmail },
            subject = "Rezervacija primljena — WashBookPro",
            html = $"""
                <h2>Pozdrav, {customerName}!</h2>
                <p>Vaša rezervacija je primljena i čeka potvrdu.</p>
                <ul>
                    <li><strong>Usluga:</strong> {serviceName}</li>
                    <li><strong>Datum:</strong> {date:dd.MM.yyyy}</li>
                    <li><strong>Vreme:</strong> {timeSlot}</li>
                </ul>
                <p>Obavestićemo vas čim rezervacija bude potvrđena.</p>
                """
        };

        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _http.PostAsync("emails", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Resend API returned {StatusCode}: {Error}", response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send booking confirmation email to {Email}", toEmail);
        }
    }


}