using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Areas.Admin.Pages.Finance;

public class VIPModel(AppDbContext db) : PageModel
{
    public List<VipPlan> Plans { get; set; } = [];

    [BindProperty] public string Name { get; set; } = string.Empty;
    [BindProperty] public string PeriodString { get; set; } = "Monthly";
    [BindProperty] public decimal Price { get; set; }
    [BindProperty] public int BonusCoins { get; set; }
    [BindProperty] public bool IsBest { get; set; }

    public async Task OnGetAsync()
    {
        Plans = await db.VipPlans.OrderByDescending(p => p.IsActive).ThenBy(p => p.Price).ToListAsync();
    }

    public async Task<IActionResult> OnPostAddAsync()
    {
        if (string.IsNullOrWhiteSpace(Name) || string.IsNullOrWhiteSpace(PeriodString) || Price < 0)
        {
            TempData["ErrorMessage"] = "تأكد من إدخال اسم الباقة، المدة، والسعر بشكل صحيح.";
            return RedirectToPage();
        }

        if (!Enum.TryParse<VipPeriod>(PeriodString, true, out var period))
            period = VipPeriod.Monthly;

        db.VipPlans.Add(new VipPlan
        {
            Name = Name,
            Period = period,
            DurationDays = period == VipPeriod.Weekly ? 7 : (period == VipPeriod.Yearly ? 365 : 30),
            Price = Price,
            BonusCoins = BonusCoins,
            IsBest = IsBest,
            IsActive = true
        });

        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = "تمت إضافة باقة الـ VIP بنجاح.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleAsync(Guid id)
    {
        var plan = await db.VipPlans.FindAsync(id);
        if (plan != null)
        {
            plan.IsActive = !plan.IsActive;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم {(plan.IsActive ? "تفعيل" : "إيقاف")} باقة {plan.Name}.";
        }
        return RedirectToPage();
    }
}
