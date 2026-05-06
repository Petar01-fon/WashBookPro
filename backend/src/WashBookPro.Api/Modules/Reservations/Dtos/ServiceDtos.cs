public record CreateServiceRequest(
    string Name,
    string VehicleCategory,
    string ServiceType,
    int DurationMinutes,
    decimal PriceRsd
);

public record UpdateServiceRequest(
    string? Name,
    string? VehicleCategory,
    string? ServiceType,
    int? DurationMinutes,
    decimal? PriceRsd,
    bool? IsActive
);

public record ServiceResponse(
    Guid Id,
    string Name,
    string VehicleCategory,
    string ServiceType,
    int DurationMinutes,
    decimal PriceRsd,
    bool IsActive
);