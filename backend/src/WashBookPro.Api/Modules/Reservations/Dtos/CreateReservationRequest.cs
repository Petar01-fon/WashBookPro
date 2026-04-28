namespace WashBookPro.Api.Modules.Reservations;
using System.ComponentModel.DataAnnotations;

public partial class ReservationsController
{
    // DTOs
    public record CreateReservationRequest
    {
        public Guid BayId { get; init; }
        public Guid ServiceId { get; init; }
        public string CustomerName { get; init; } = string.Empty;
        public string CustomerPhone { get; init; } = string.Empty;
        [Required]
        [EmailAddress]
        public string CustomerEmail { get; init; } = string.Empty;
        public DateTime StartsAt { get; init; }
        public string? Notes { get; init; }
        public string? CreatedBy { get; init; } // "Customer" or "Worker"
        public string? TenantSlug { get; set; }
        // public string Email { get; set; } = string.Empty; // For authentication
    }

}
