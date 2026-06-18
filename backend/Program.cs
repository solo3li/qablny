using System.Text;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Minio;
using Qablny.Data;
using Qablny.Hubs;
using Qablny.Middleware;
using Qablny.Services;
using Microsoft.AspNetCore.SignalR;
using Serilog;
using StackExchange.Redis;


var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ── PostgreSQL + EF Core ──────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Redis ─────────────────────────────────────────────────────────────────────
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConn));
builder.Services.AddStackExchangeRedisCache(opts => opts.Configuration = redisConn);

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret  = builder.Configuration["Jwt:Secret"]   ?? throw new Exception("Jwt:Secret required");
var jwtIssuer  = builder.Configuration["Jwt:Issuer"]   ?? "qablny-api";
var jwtAudience= builder.Configuration["Jwt:Audience"] ?? "qablny-app";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew                = TimeSpan.Zero,
        };
        // Support JWT in SignalR query string
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// ── SignalR + Redis Backplane ──────────────────────────────────────────────────
builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConn, opts =>
        opts.Configuration.ChannelPrefix = RedisChannel.Literal("qablny"));

// ── MinIO ─────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IMinioClient>(_ =>
{
    var cfg = builder.Configuration.GetSection("MinIO");
    return new MinioClient()
        .WithEndpoint(cfg["Endpoint"] ?? "minio:9000")
        .WithCredentials(cfg["AccessKey"], cfg["SecretKey"])
        .Build();
});

// ── LibreTranslate HTTP Client ────────────────────────────────────────────────
builder.Services.AddHttpClient("LibreTranslate", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["LibreTranslate:BaseUrl"] ?? "http://libretranslate:5000");
    c.Timeout     = TimeSpan.FromSeconds(5);
});

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<FriendService>();
builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<CoinService>();
builder.Services.AddScoped<GiftService>();
builder.Services.AddScoped<VipService>();
builder.Services.AddScoped<ModerationService>();
builder.Services.AddScoped<PresenceService>();
builder.Services.AddScoped<MatchService>();
builder.Services.AddSingleton<LiveKitService>();
builder.Services.AddSingleton<MinioStorageService>();
builder.Services.AddHttpClient<PushNotificationService>();

// Background matching service
builder.Services.AddHostedService<MatchingBackgroundService>();

// ── Controllers, Razor Pages & OpenAPI ────────────────────────────────────────
builder.Services.AddControllersWithViews();
builder.Services.AddRazorPages();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opts => opts.AddPolicy("AllowAll", p =>
    p.SetIsOriginAllowed(_ => true)
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

// ═════════════════════════════════════════════════════════════════════════════
var app = builder.Build();

// ── DB Init ───────────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync(); // creates schema + seed data
    Log.Information("Database ready ✓");
}

// ── Middleware Pipeline ───────────────────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference(opts =>
{
    opts.WithTitle("Qablny API");
});

app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapRazorPages();

// ── SignalR Hubs ──────────────────────────────────────────────────────────────
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<MatchHub>("/hubs/match");
app.MapHub<NotificationHub>("/hubs/notifications");

// ── Health check ─────────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "healthy", time = DateTime.UtcNow }));

Log.Information("Qablny API starting on .NET 10 🚀");
app.Run();

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
            ?? connection.User?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    }
}
