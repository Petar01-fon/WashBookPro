using System.Text.Json.Serialization;
using WashBookPro.Api.Common.Persistence;

public class Customer : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Phone { get; set; } = string.Empty;

    [JsonIgnore]
    public ICollection<Reservation> Reservations { get; set; } = [];
}
