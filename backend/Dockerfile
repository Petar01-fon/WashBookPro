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

# Stage: EF Core migration bundle (run once per deploy, before `up`; ADR-025)
FROM build AS migrations
RUN dotnet tool install --global dotnet-ef --version 10.0.4
ENV PATH="${PATH}:/root/.dotnet/tools"
RUN dotnet ef migrations bundle \
    --project src/WashBookPro.Api/WashBookPro.Api.csproj \
    --configuration Release \
    --runtime linux-x64 \
    --output /app/efbundle \
    --force

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS migrate
WORKDIR /app
COPY --from=migrations /app/efbundle .
ENTRYPOINT ["sh", "-c", "./efbundle --connection \"$ConnectionStrings__Default\""]

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WashBookPro.Api.dll"]