using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using WashBookPro.Api.Common.Formatting;

namespace WashBookPro.Api.Common.Email;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _http;
    private readonly string _fromEmail;
    private readonly ILogger<ResendEmailService> _logger;

    // Hex values pulled from web/app/globals.css's :root token block — email HTML
    // can't read CSS custom properties, so these are frozen copies, not references.
    // --wb-muted is rgba(10,14,39,0.6) in the source; email clients (Outlook's Word
    // engine especially) don't reliably honor alpha, so it's pre-blended here over
    // the white card background (#FFFFFF) it actually sits on into a solid hex.
    private const string ColorBg = "#FAFAF7";
    private const string ColorFg = "#0A0E27";
    private const string ColorAccent = "#2563EB";
    private const string ColorBorder = "#E8E6E0";
    private const string ColorMuted = "#6C6E7D";
    private const string ColorCardBg = "#FFFFFF";
    private const string ColorWhite = "#FFFFFF";

    public ResendEmailService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ResendEmailService> logger)
    {
        _http = httpClientFactory.CreateClient("Resend");
        _fromEmail = configuration["Resend:FromEmail"] ?? "noreply@washbookpro.rs";
        _logger = logger;
    }

    public async Task<bool> SendBookingConfirmationAsync(
        BookingConfirmationEmail email,
        CancellationToken cancellationToken = default)
    {
        var body = new
        {
            from = _fromEmail,
            to = new[] { email.ToEmail },
            subject = "Rezervacija primljena — WashBookPro",
            html = BuildHtml(email)
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
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send booking confirmation email to {Email}", email.ToEmail);
            return false;
        }
    }

    // Table-based layout, all styles inline, no <style> block, no CSS variables,
    // no images — required for Outlook's Word rendering engine and for clients
    // that strip <head> styles or block remote images by default (Gmail).
    private static string BuildHtml(BookingConfirmationEmail email)
    {
        // Every value below that can originate from user input — customer name,
        // service name, plate, tenant name/address/phone — is HTML-encoded before
        // interpolation. CustomerName in particular comes through the [AllowAnonymous]
        // POST /reservations endpoint with no server-side content restriction, so an
        // unescaped value would let anyone inject markup (a link, an <img>) into an
        // email that arrives from the wash's own address — a phishing vector.
        // dateText/timeText/priceText are server-computed from a DateTime/decimal,
        // never raw user text, so they're left as-is.
        var customerName = WebUtility.HtmlEncode(email.CustomerName);
        var serviceName = WebUtility.HtmlEncode(email.ServiceName);
        var tenantName = WebUtility.HtmlEncode(email.TenantName);
        var dateText = SerbianDateFormatter.FormatLong(email.StartsAtBelgrade);
        var timeText = email.StartsAtBelgrade.ToString("HH:mm");
        var priceText = FormatPriceRsd(email.PriceRsd);

        var plateRow = string.IsNullOrWhiteSpace(email.PlateNumber)
            ? ""
            : DetailRow("Tablica", WebUtility.HtmlEncode(email.PlateNumber));

        var footer = BuildFooter(email.TenantAddress, email.TenantPhone);

        return $"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{ColorBg};">
              <tr>
                <td align="center" style="padding:24px 12px;">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:{ColorCardBg};border:1px solid {ColorBorder};">
                    <tr>
                      <td style="background-color:{ColorAccent};padding:20px 24px;">
                        <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:{ColorWhite};">{tenantName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:{ColorFg};">
                        <p style="margin:0 0 16px 0;font-size:16px;">Pozdrav, {customerName}!</p>
                        <p style="margin:0 0 24px 0;font-size:14px;">Vaša rezervacija je primljena. Termin je rezervisan za vas.</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {ColorBorder};margin-bottom:24px;">
                          <tr>
                            <td align="center" style="padding:16px 16px 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{ColorFg};">{dateText}</td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:4px 16px 16px 16px;font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:bold;color:{ColorFg};">{timeText}</td>
                          </tr>
                        </table>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{ColorFg};">
            {DetailRow("Usluga", serviceName)}{DetailRow("Cena", $"{priceText} RSD")}{plateRow}
                        </table>
                      </td>
                    </tr>
            {footer}
                  </table>
                </td>
              </tr>
            </table>
            """;
    }

    // `label` is always a static string literal from a call site in this file;
    // `value` must already be HTML-encoded by the caller if it can contain user
    // input (see BuildHtml) — this method does not encode, to avoid double-encoding
    // the already-safe, server-formatted values (price, static labels) also passed
    // through it.
    private static string DetailRow(string label, string value) => $"""
                          <tr>
                            <td style="padding:4px 0;">{label}</td>
                            <td align="right" style="padding:4px 0;font-weight:bold;">{value}</td>
                          </tr>

        """;

    // Omitted entirely (no row, no dash) when the tenant has neither address nor
    // phone on file — not every tenant fills those in yet (Tenant.Phone is
    // nullable, seeded only for dev-wash so far).
    private static string BuildFooter(string? address, string? phone)
    {
        if (string.IsNullOrWhiteSpace(address) && string.IsNullOrWhiteSpace(phone))
            return "";

        var lines = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(address))
            lines.Append($"""<div style="margin-bottom:2px;">{WebUtility.HtmlEncode(address)}</div>""");
        if (!string.IsNullOrWhiteSpace(phone))
            lines.Append($"""<div>{WebUtility.HtmlEncode(phone)}</div>""");

        return $"""
                    <tr>
                      <td style="padding:16px 24px;border-top:1px solid {ColorBorder};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{ColorMuted};">
                        {lines}
                      </td>
                    </tr>
            """;
    }

    // "1.200 RSD" — dot as thousands separator. InvariantCulture guarantees "," as
    // the group separator regardless of host locale, then it's swapped explicitly
    // rather than trusting a culture's NumberFormatInfo, for the same reason
    // sr-Latn-RS isn't trusted for date formatting elsewhere in this commit.
    private static string FormatPriceRsd(decimal price)
    {
        var wholeRsd = decimal.Round(price, 0, MidpointRounding.AwayFromZero);
        return wholeRsd.ToString("N0", CultureInfo.InvariantCulture).Replace(",", ".");
    }
}
