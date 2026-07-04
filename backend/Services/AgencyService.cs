using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Qablny.Data;
using Qablny.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Qablny.Services;

public class AgencyService(AppDbContext db, IConfiguration config)
{
    public async Task<AgencyAuthResponse> LoginAsync(AgencyLoginRequest req)
    {
        var manager = await db.AgencyManagers
            .Include(m => m.Agency)
            .FirstOrDefaultAsync(m => m.Username == req.Username);

        if (manager == null || !BCrypt.Net.BCrypt.Verify(req.Password, manager.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        if (!manager.IsActive || !manager.Agency.IsActive)
            throw new UnauthorizedAccessException("Account is disabled");

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(config["Jwt:Secret"]!);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, manager.Id.ToString()),
                new Claim("AgencyId", manager.AgencyId.ToString()),
                new Claim(ClaimTypes.Role, "AgencyManager")
            ]),
            Expires = DateTime.UtcNow.AddDays(1),
            Issuer = config["Jwt:Issuer"],
            Audience = config["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        
        return new AgencyAuthResponse(
            Token: tokenHandler.WriteToken(token),
            AgencyId: manager.AgencyId,
            AgencyName: manager.Agency.Name,
            ManagerName: manager.FullName,
            InviteCode: manager.Agency.InviteCode
        );
    }

    public async Task<AgencyDashboardDto> GetDashboardStatsAsync(Guid agencyId)
    {
        var agency = await db.Agencies
            .Include(a => a.Hosts)
            .FirstOrDefaultAsync(a => a.Id == agencyId);

        if (agency == null) throw new KeyNotFoundException("Agency not found");

        int activeHosts = agency.Hosts.Count(h => h.IsOnline);
        int totalHosts = agency.Hosts.Count;
        int totalEarnings = agency.TotalEarnings; // Can be aggregated from transactions
        int agencyCut = (int)(totalEarnings * (agency.AgencyCutPercentage / 100.0));

        // Read real target from DB
        int monthlyTarget = agency.TargetCoins;
        int currentProgress = totalEarnings;

        return new AgencyDashboardDto(
            agency.Name,
            activeHosts,
            totalHosts,
            totalEarnings,
            agencyCut,
            monthlyTarget,
            currentProgress
        );
    }

    public async Task<List<AgencyHostDto>> GetHostsAsync(Guid agencyId)
    {
        var hosts = await db.Users
            .Where(u => u.AgencyId == agencyId)
            .Select(u => new AgencyHostDto(
                u.Id,
                u.Name,
                u.IsOnline ? "Online" : "Offline", // Status
                u.Coins, // Earnings roughly mapping to coins for now
                u.TotalMatches / 2, // Mock hours logged based on matches
                u.JoinedAt.ToString("yyyy-MM-dd")
            ))
            .ToListAsync();

        return hosts;
    }

    public async Task RemoveHostAsync(Guid agencyId, Guid hostId)
    {
        var host = await db.Users.FirstOrDefaultAsync(u => u.Id == hostId && u.AgencyId == agencyId);
        if (host != null)
        {
            host.AgencyId = null;
            await db.SaveChangesAsync();
        }
    }

    public async Task<List<PayoutRequestDto>> GetPayoutsAsync(Guid agencyId)
    {
        return await db.PayoutRequests
            .Where(pr => pr.AgencyId == agencyId)
            .OrderByDescending(pr => pr.CreatedAt)
            .Select(pr => new PayoutRequestDto(
                pr.Id,
                pr.Amount,
                pr.Status,
                pr.AdminNote,
                pr.CreatedAt,
                pr.ProcessedAt
            ))
            .ToListAsync();
    }

    public async Task<PayoutRequestDto> RequestPayoutAsync(Guid agencyId, CreatePayoutRequest req)
    {
        // For simplicity, we just create it. Real app might check available balance
        var pr = new Entities.PayoutRequest
        {
            AgencyId = agencyId,
            Amount = req.Amount,
            Status = "Pending"
        };
        
        db.PayoutRequests.Add(pr);
        await db.SaveChangesAsync();

        return new PayoutRequestDto(
            pr.Id,
            pr.Amount,
            pr.Status,
            pr.AdminNote,
            pr.CreatedAt,
            pr.ProcessedAt
        );
    }
}
