using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Qablny.Areas.Admin.Pages.Finance;

public class CoinsModel : PageModel
{
    // Mock data since we didn't add CoinPackage to the DB yet
    public record CoinPackage(Guid Id, string Name, int Coins, decimal Price, int Bonus);

    public List<CoinPackage> Packages { get; set; } = [
        new CoinPackage(Guid.NewGuid(), "حزمة البداية", 100, 1.99m, 0),
        new CoinPackage(Guid.NewGuid(), "حزمة التوفير", 500, 4.99m, 50),
        new CoinPackage(Guid.NewGuid(), "الحزمة الكبرى", 1200, 9.99m, 200)
    ];

    public void OnGet()
    {
    }
}
