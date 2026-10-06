using WashBookPro.Api.Common.Email;

namespace WashBookPro.Api.Tests.Infrastructure;

public sealed class FakeEmailService : IEmailService
{
    public bool NextResult { get; set; } = true;
    public bool ThrowNext { get; set; }
    public List<BookingConfirmationEmail> Sent { get; } = [];

    public Task<bool> SendBookingConfirmationAsync(
        BookingConfirmationEmail email,
        CancellationToken cancellationToken = default)
    {
        if (ThrowNext)
        {
            ThrowNext = false;
            throw new InvalidOperationException("fake email failure");
        }

        Sent.Add(email);
        var result = NextResult;
        NextResult = true;
        return Task.FromResult(result);
    }
}
