using System.Text.Json.Serialization;
using WashBookPro.Api.Common.Persistence;

public class Service : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string VehicleCategory { get; set; } = string.Empty;// "Car", "SUV", "Van"
    public string ServiceType { get; set; } = string.Empty;// "Basic", "Deep"
    public int DurationMinutes { get; set; }
    public decimal PriceRsd { get; set; }
    public bool IsActive { get; set; } = true;
    [JsonIgnore]
    public ICollection<Reservation> Reservations { get; set; } = [];
}
