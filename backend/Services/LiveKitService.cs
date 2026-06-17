using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Qablny.Services;

public class LiveKitService(IConfiguration config)
{
    private string ApiKey    => config["LiveKit:ApiKey"]!;
    private string ApiSecret => config["LiveKit:ApiSecret"]!;
    public  string ServerUrl => config["LiveKit:PublicUrl"] ?? "ws://localhost:7880";

    public string GenerateToken(Guid userId, string displayName, string roomName, bool canPublish = true)
    {
        var header  = B64Url("""{"alg":"HS256","typ":"JWT"}""");
        var now     = DateTimeOffset.UtcNow;

        var payload = JsonSerializer.Serialize(new
        {
            iss  = ApiKey,
            sub  = userId.ToString(),
            name = displayName,
            iat  = now.ToUnixTimeSeconds(),
            nbf  = now.ToUnixTimeSeconds(),
            exp  = now.AddHours(6).ToUnixTimeSeconds(),
            video = new
            {
                room         = roomName,
                roomJoin     = true,
                canPublish   = canPublish,
                canSubscribe = true,
            }
        });

        var payloadB64  = B64Url(payload);
        var signingInput = $"{header}.{payloadB64}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(ApiSecret));
        var sig = B64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput)));
        return $"{signingInput}.{sig}";
    }

    public string NewRoomName() => $"room_{Guid.NewGuid():N}";

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static string B64Url(string s) => B64Url(Encoding.UTF8.GetBytes(s));
    private static string B64Url(byte[] b) =>
        Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
