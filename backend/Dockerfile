# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/WashBookPro.Api/WashBookPro.Api.csproj src/WashBookPro.Api/
RUN dotnet restore src/WashBookPro.Api/WashBookPro.Api.csproj \
    --runtime linux-x64

COPY . .
RUN dotnet publish src/WashBookPro.Api/WashBookPro.Api.csproj \
    -c Release \
    -r linux-x64 \
    --self-contained false \
    -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WashBookPro.Api.dll"]