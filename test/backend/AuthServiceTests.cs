using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;
using Qablny.Services;

namespace Qablny.Tests;

public class AuthServiceTests
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _db = new AppDbContext(options);

        var myConfiguration = new Dictionary<string, string>
        {
            {"Jwt:Secret", "A_Very_Long_Super_Secret_Key_For_Testing_Only_12345!"},
            {"Jwt:Issuer", "TestIssuer"},
            {"Jwt:Audience", "TestAudience"},
            {"Jwt:ExpiryMinutes", "60"}
        };

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(myConfiguration!)
            .Build();

        _authService = new AuthService(_db, _config);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsUnauthorized()
    {
        // Arrange
        var user = new User
        {
            Email = "test@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123"),
            Name = "Test User"
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var loginReq = new LoginRequest("test@test.com", "WrongPassword");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(loginReq));
    }

    [Fact]
    public async Task Login_WithBlockedUser_ThrowsUnauthorized()
    {
        // Arrange
        var user = new User
        {
            Email = "blocked@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
            Name = "Blocked User",
            IsBlocked = true
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var loginReq = new LoginRequest("blocked@test.com", "Password123");

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(loginReq));
        Assert.Equal("تم حظر هذا الحساب", ex.Message);
    }

    [Fact]
    public async Task Login_WithCorrectCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var user = new User
        {
            Email = "valid@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
            Name = "Valid User"
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var loginReq = new LoginRequest("valid@test.com", "Password123");

        // Act
        var response = await _authService.LoginAsync(loginReq);

        // Assert
        Assert.NotNull(response);
        Assert.NotNull(response.AccessToken);
        Assert.NotNull(response.RefreshToken);
        Assert.Equal("Valid User", response.User.Name);
    }
}
