using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Services;

namespace Qablny.Areas.Admin.Pages.Communications;

public class GlobalModel(AppDbContext db, PushNotificationService pushService) : PageModel
{
    public List<PushNotificationLog> RecentLogs { get; set; } = [];
    public string? SuccessMessage { get; set; }
    public string? ErrorMessage { get; set; }

    public async Task OnGetAsync()
    {
        RecentLogs = await db.PushNotificationLogs
            .OrderByDescending(l => l.SentAt)
            .Take(20)
            .ToListAsync();
    }

    public async Task<IActionResult> OnPostSendAsync(string title, string body, string audience)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body))
        {
            TempData["ErrorMessage"] = "العنوان والمحتوى مطلوبان.";
            return RedirectToPage();
        }

        try
        {
            IQueryable<User> query = db.Users.Where(u => !u.IsBlocked && u.ExpoPushToken != null);

            if (audience == "VIP")
                query = query.Where(u => u.IsVip);
            else if (audience == "NonVIP")
                query = query.Where(u => !u.IsVip);

            var tokens = await query.Select(u => u.ExpoPushToken!).ToListAsync();
            int sentCount = await pushService.SendBulkPushAsync(tokens, title, body);

            var log = new PushNotificationLog
            {
                Title = title,
                Body = body,
                TargetAudience = audience ?? "Global",
                SentAt = DateTime.UtcNow,
                SentCount = sentCount
            };

            db.PushNotificationLogs.Add(log);
            await db.SaveChangesAsync();

            TempData["SuccessMessage"] = $"تم إرسال الإشعار بنجاح إلى {sentCount} مستخدم.";
        }
        catch (Exception ex)
        {
            TempData["ErrorMessage"] = "حدث خطأ: " + ex.Message;
        }

        return RedirectToPage();
    }
}
