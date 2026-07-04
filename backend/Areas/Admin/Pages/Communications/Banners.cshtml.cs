using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Services;

namespace Qablny.Areas.Admin.Pages.Communications;

public class BannersModel(AppDbContext db, MinioStorageService storage) : PageModel
{
    public List<Banner> Banners { get; set; } = [];

    [BindProperty] public string? LinkUrl { get; set; }
    [BindProperty] public IFormFile? ImageFile { get; set; }

    public async Task OnGetAsync()
    {
        Banners = await db.Banners.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<IActionResult> OnPostAddAsync()
    {
        if (ImageFile == null || ImageFile.Length == 0)
        {
            TempData["ErrorMessage"] = "يجب اختيار صورة للبانر.";
            return RedirectToPage();
        }

        var ext = Path.GetExtension(ImageFile.FileName).ToLower();
        if (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp")
        {
            TempData["ErrorMessage"] = "صيغة الصورة غير مدعومة.";
            return RedirectToPage();
        }

        var objectName = $"banners/{Guid.NewGuid()}{ext}";
        using var stream = ImageFile.OpenReadStream();
        var imageUrl = await storage.UploadAsync(stream, objectName, ImageFile.ContentType);

        db.Banners.Add(new Banner
        {
            ImageUrl = imageUrl,
            LinkUrl = LinkUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = "تم رفع البانر بنجاح.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleAsync(Guid id)
    {
        var banner = await db.Banners.FindAsync(id);
        if (banner != null)
        {
            banner.IsActive = !banner.IsActive;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم {(banner.IsActive ? "تفعيل" : "إيقاف")} البانر.";
        }
        return RedirectToPage();
    }
}
