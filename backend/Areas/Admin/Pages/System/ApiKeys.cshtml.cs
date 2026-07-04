using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;

namespace Qablny.Areas.Admin.Pages.System;

public class ApiKeysModel(AppDbContext db) : PageModel
{
    public Dictionary<string, string> Keys { get; set; } = new();

    public async Task OnGetAsync()
    {
        var relevant = new[] {
            "LiveKit:ApiKey", "LiveKit:ApiSecret",
            "Minio:AccessKey", "Minio:SecretKey",
            "App:JwtSecret"
        };

        // Load from system settings (non-sensitive display)
        var settings = await db.SystemSettings
            .Where(s => relevant.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        // Also load from config (if stored there)
        foreach (var key in relevant)
        {
            if (!settings.ContainsKey(key))
                settings[key] = "[غير مضاف في قاعدة البيانات]";
        }

        // Mask secrets
        Keys = settings.ToDictionary(
            kv => kv.Key,
            kv => kv.Key.Contains("Secret") || kv.Key.Contains("Password")
                ? MaskSecret(kv.Value)
                : kv.Value
        );
    }

    private static string MaskSecret(string value)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= 6) return "****";
        return value[..3] + new string('*', value.Length - 6) + value[^3..];
    }
}
