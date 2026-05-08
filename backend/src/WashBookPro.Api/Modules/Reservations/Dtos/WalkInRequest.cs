namespace WashBookPro.Api.Modules.Reservations;
using System.ComponentModel.DataAnnotations;

public partial class ReservationsController
{
    public record WalkInRequest
    {
        public Guid ServiceId { get; init; }
        public Guid BayId { get; init; }
        public DateTime StartsAt { get; init; }
        [Required]
        public string CustomerName { get; init; } = string.Empty;
        [Required]
        public string CustomerPhone { get; init; } = string.Empty;
        [Required]
        [EmailAddress]
        public string CustomerEmail { get; init; } = string.Empty;
        public string? Notes { get; init; }
    }
}
