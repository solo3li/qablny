using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Qablny.Data;
using Qablny.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Qablny.Services;

public class AgencyService(AppDbContext db, IConfiguration config, PresenceService presence)
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

        int activeHosts = 0;
        foreach (var h in agency.Hosts)
        {
            if (await presence.IsOnlineAsync(h.Id))
                activeHosts++;
        }
        int totalHosts = agency.Hosts.Count;
        int totalEarnings = agency.Hosts.Sum(h => h.Coins); // Aggregated from actual host balances
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
        var dbHosts = await db.Users
            .Where(u => u.AgencyId == agencyId)
            .ToListAsync();
            
        var hosts = new List<AgencyHostDto>();
        foreach (var u in dbHosts)
        {
            bool isOnline = await presence.IsOnlineAsync(u.Id);
            hosts.Add(new AgencyHostDto(
                u.Id,
                u.Name,
                isOnline ? "Online" : "Offline", // Status
                u.Coins, // Earnings roughly mapping to coins for now
                u.TotalMatches, // Actual matches count
                u.JoinedAt.ToString("yyyy-MM-dd")
            ));
        }

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

    public async Task<List<AgencyTransactionDto>> GetTransactionsAsync(Guid agencyId)
    {
        var transactions = await db.CoinTransactions
            .Include(ct => ct.User)
            .Where(ct => ct.User.AgencyId == agencyId)
            .OrderByDescending(ct => ct.CreatedAt)
            .Take(50)
            .Select(ct => new AgencyTransactionDto(
                ct.Id,
                ct.Type.ToString(),
                ct.User.Name,
                ct.Amount,
                ct.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            ))
            .ToListAsync();
        
        return transactions;
    }
}
