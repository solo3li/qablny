using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Areas.Admin.Pages.Users;

public class BalancesModel(AppDbContext db) : PageModel
{
    [BindProperty] public Guid UserId { get; set; }
    [BindProperty] public string ActionType { get; set; } = "add";
    [BindProperty] public int Amount { get; set; }
    [BindProperty] public string Reason { get; set; } = string.Empty;

    public List<CoinTransaction> RecentTransactions { get; set; } = [];

    public async Task OnGetAsync()
    {
        RecentTransactions = await db.CoinTransactions
            .Include(t => t.User)
            .Where(t => t.Type == CoinTransactionType.Deduction || t.Description != null)
            .OrderByDescending(t => t.CreatedAt)
            .Take(30)
            .ToListAsync();
    }

    public async Task<IActionResult> OnPostUpdateAsync()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user == null)
        {
            TempData["ErrorMessage"] = "المستخدم غير موجود.";
            return RedirectToPage();
        }

        int delta = ActionType == "add" ? Amount : -Amount;
        user.Coins = Math.Max(0, user.Coins + delta);

        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId = user.Id,
            Amount = delta,
            Type = delta > 0 ? CoinTransactionType.VipReward : CoinTransactionType.Deduction,
            Description = Reason,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        TempData["SuccessMessage"] = $"تم {(delta > 0 ? "إضافة" : "خصم")} {Math.Abs(delta)} عملة {(delta > 0 ? "إلى" : "من")} حساب {user.Name}. الرصيد الحالي: {user.Coins}.";
        return RedirectToPage();
    }
}
