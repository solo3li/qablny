using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Finance;

public class CoinsModel(AppDbContext db) : PageModel
{
    public List<CoinPackage> Packages { get; set; } = [];

    [BindProperty] public string Name { get; set; } = string.Empty;
    [BindProperty] public int Coins { get; set; }
    [BindProperty] public decimal Price { get; set; }
    [BindProperty] public int Bonus { get; set; }

    public async Task OnGetAsync()
    {
        Packages = await db.CoinPackages.OrderByDescending(p => p.IsActive).ThenBy(p => p.Price).ToListAsync();
    }

    public async Task<IActionResult> OnPostAddAsync()
    {
        if (string.IsNullOrWhiteSpace(Name) || Coins <= 0 || Price < 0)
        {
            TempData["ErrorMessage"] = "تأكد من إدخال اسم الحزمة، عدد العملات، والسعر بشكل صحيح.";
            return RedirectToPage();
        }

        db.CoinPackages.Add(new CoinPackage
        {
            Name = Name,
            Coins = Coins,
            Price = Price,
            Bonus = Bonus,
            IsActive = true
        });

        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = "تمت إضافة حزمة العملات بنجاح.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleAsync(Guid id)
    {
        var pkg = await db.CoinPackages.FindAsync(id);
        if (pkg != null)
        {
            pkg.IsActive = !pkg.IsActive;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم {(pkg.IsActive ? "تفعيل" : "إيقاف")} حزمة {pkg.Name}.";
        }
        return RedirectToPage();
    }
}
