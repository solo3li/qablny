using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Qablny.Services;

public class PushNotificationService(HttpClient http, ILogger<PushNotificationService> logger)
{
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

    public async Task SendPushAsync(string to, string title, string body, object? data = null)
    {
        if (string.IsNullOrWhiteSpace(to) || !to.StartsWith("ExponentPushToken["))
        {
            return;
        }

        var payload = new
        {
            to,
            title,
            body,
            data,
            sound = "default"
        };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await http.PostAsync(ExpoPushUrl, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                logger.LogWarning($"Failed to send Expo push notification to {to}. Response: {error}");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Error sending push notification to {to}");
        }
    }

    /// <summary>
    /// Send a push notification to multiple tokens at once (batch)
    /// </summary>
    public async Task<int> SendBulkPushAsync(IEnumerable<string> tokens, string title, string body, object? data = null)
    {
        var validTokens = tokens
            .Where(t => !string.IsNullOrWhiteSpace(t) && t.StartsWith("ExponentPushToken["))
            .ToList();

        if (validTokens.Count == 0) return 0;

        // Expo supports up to 100 messages per request
        var chunks = validTokens
            .Select((t, i) => new { t, i })
            .GroupBy(x => x.i / 100)
            .Select(g => g.Select(x => x.t).ToList());

        int sent = 0;
        foreach (var chunk in chunks)
        {
            var payloads = chunk.Select(token => new
            {
                to = token,
                title,
                body,
                data,
                sound = "default"
            });

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(payloads), Encoding.UTF8, "application/json");
                var response = await http.PostAsync(ExpoPushUrl, content);
                if (response.IsSuccessStatusCode)
                    sent += chunk.Count;
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    logger.LogWarning($"Bulk push failed. Response: {error}");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error sending bulk push notifications");
            }
        }

        return sent;
    }
}
