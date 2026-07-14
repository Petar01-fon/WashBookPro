using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Reservations.Entities;

public class Reservation : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BayId { get; set; }
    public Guid ServiceId { get; set; }
    public Guid CustomerId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;
    public string? PlateNumber { get; set; }
    public string? Notes { get; set; }
    public ReservationCreatedBy CreatedBy { get; set; } = ReservationCreatedBy.Customer;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Bay Bay { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
