using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Agencies;

public class IndexModel(AppDbContext db) : PageModel
{
    public List<AgencyViewModel> Agencies { get; set; } = new();

    public string? SuccessMessage { get; set; }
    public string? ErrorMessage { get; set; }

    [BindProperty]
    public string AgencyName { get; set; } = string.Empty;
    [BindProperty]
    public int AgencyCut { get; set; } = 20;
    [BindProperty]
    public string ManagerName { get; set; } = string.Empty;
    [BindProperty]
    public string Username { get; set; } = string.Empty;
    [BindProperty]
    public string Password { get; set; } = string.Empty;

    public async Task OnGetAsync()
    {
        await LoadAgenciesAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (string.IsNullOrWhiteSpace(AgencyName) || string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "جميع الحقول مطلوبة.";
            await LoadAgenciesAsync();
            return Page();
        }

        // Check if username already exists
        if (await db.AgencyManagers.AnyAsync(m => m.Username == Username))
        {
            ErrorMessage = "اسم الدخول للمدير موجود مسبقاً. يرجى اختيار اسم آخر.";
            await LoadAgenciesAsync();
            return Page();
        }

        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            // Create Agency
            var inviteCode = GenerateInviteCode();
            
            // Ensure invite code is unique
            while (await db.Agencies.AnyAsync(a => a.InviteCode == inviteCode))
            {
                inviteCode = GenerateInviteCode();
            }

            var agency = new Agency
            {
                Name = AgencyName,
                InviteCode = inviteCode,
                AgencyCutPercentage = AgencyCut,
                IsActive = true
            };
            
            db.Agencies.Add(agency);
            await db.SaveChangesAsync(); // Save to get the Agency Id

            // Create Manager
            var manager = new AgencyManager
            {
                AgencyId = agency.Id,
                Username = Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
                FullName = ManagerName,
                IsActive = true
            };

            db.AgencyManagers.Add(manager);
            await db.SaveChangesAsync();

            await transaction.CommitAsync();

            SuccessMessage = $"تم إنشاء الوكالة بنجاح! كود الدعوة للمضيفين هو: {inviteCode}";
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            ErrorMessage = "حدث خطأ أثناء إنشاء الوكالة: " + ex.Message;
        }

        await LoadAgenciesAsync();
        return Page();
    }

    private async Task LoadAgenciesAsync()
    {
        Agencies = await db.Agencies
            .Select(a => new AgencyViewModel
            {
                Id = a.Id,
                Name = a.Name,
                InviteCode = a.InviteCode,
                AgencyCutPercentage = a.AgencyCutPercentage,
                IsActive = a.IsActive,
                HostsCount = db.Users.Count(u => u.AgencyId == a.Id)
            })
            .ToListAsync();
    }

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 6)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    public class AgencyViewModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty;
        public int AgencyCutPercentage { get; set; }
        public bool IsActive { get; set; }
        public int HostsCount { get; set; }
    }
}
