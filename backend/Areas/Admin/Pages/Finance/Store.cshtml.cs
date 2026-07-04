using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Finance;

public class StoreModel(AppDbContext db) : PageModel
{
    public List<Gift> Gifts { get; set; } = [];

    [BindProperty] public string Name { get; set; } = string.Empty;
    [BindProperty] public string Emoji { get; set; } = string.Empty;
    [BindProperty] public int CoinCost { get; set; }

    public async Task OnGetAsync()
    {
        Gifts = await db.Gifts.OrderByDescending(g => g.IsActive).ThenBy(g => g.CoinCost).ToListAsync();
    }

    public async Task<IActionResult> OnPostAddAsync()
    {
        if (string.IsNullOrWhiteSpace(Name) || string.IsNullOrWhiteSpace(Emoji) || CoinCost <= 0)
        {
            TempData["ErrorMessage"] = "يجب إدخال اسم الهدية، الإيموجي، والتكلفة بشكل صحيح.";
            return RedirectToPage();
        }

        db.Gifts.Add(new Gift
        {
            Name = Name,
            Emoji = Emoji,
            CoinCost = CoinCost,
            IsActive = true
        });

        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = "تمت إضافة الهدية بنجاح.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleAsync(Guid id)
    {
        var gift = await db.Gifts.FindAsync(id);
        if (gift != null)
        {
            gift.IsActive = !gift.IsActive;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم {(gift.IsActive ? "تفعيل" : "إيقاف")} الهدية.";
        }
        return RedirectToPage();
    }
}
