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
}
