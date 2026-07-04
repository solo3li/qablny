using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class BlacklistModel(AppDbContext db) : PageModel
{
    public List<string> Words { get; set; } = [];

    [BindProperty] public string NewWord { get; set; } = string.Empty;

    public async Task OnGetAsync()
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:BlacklistedWords");
        if (setting != null && !string.IsNullOrWhiteSpace(setting.Value))
            Words = setting.Value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(w => w.Trim()).ToList();
    }

    public async Task<IActionResult> OnPostAddAsync()
    {
        if (string.IsNullOrWhiteSpace(NewWord))
        {
            TempData["ErrorMessage"] = "الكلمة لا يمكن أن تكون فارغة.";
            return RedirectToPage();
        }

        var words = await GetCurrentWords();
        var w = NewWord.Trim().ToLower();
        if (!words.Contains(w)) words.Add(w);

        await SaveWords(words);
        TempData["SuccessMessage"] = $"تمت إضافة الكلمة \"{w}\" إلى القائمة السوداء.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRemoveAsync(string word)
    {
        var words = await GetCurrentWords();
        words.Remove(word.Trim().ToLower());
        await SaveWords(words);
        TempData["SuccessMessage"] = $"تم حذف الكلمة \"{word}\" من القائمة.";
        return RedirectToPage();
    }

    private async Task<List<string>> GetCurrentWords()
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:BlacklistedWords");
        if (setting == null || string.IsNullOrWhiteSpace(setting.Value)) return [];
        return setting.Value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(w => w.Trim()).ToList();
    }

    private async Task SaveWords(List<string> words)
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:BlacklistedWords");
        var value = string.Join(",", words);
        if (setting == null)
            db.SystemSettings.Add(new SystemSetting { Key = "App:BlacklistedWords", Value = value, Description = "كلمات محظورة في التطبيق" });
        else
            setting.Value = value;
        await db.SaveChangesAsync();
    }
}
