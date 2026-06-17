# 🚀 Qablny Backend — دليل التشغيل

## بنية المشروع (Single Project)

```
backend/
├── Qablny.API.csproj      ← Project file (.NET 10)
├── Program.cs             ← Entry point + DI + middleware
├── appsettings.json
├── appsettings.Development.json
├── Dockerfile             ← Multi-stage (.NET 10)
├── docker-compose.yml     ← كل الخدمات
├── .env.example           ← انسخه إلى .env
│
├── Entities/Entities.cs   ← كل الـ domain entities
├── Enums/Enums.cs
├── Data/AppDbContext.cs   ← EF Core + seed data
├── DTOs/Dtos.cs           ← كل الـ request/response records
│
├── Services/
│   ├── AuthService.cs          ← JWT + BCrypt + refresh tokens
│   ├── UserFriendService.cs    ← UserService + FriendService
│   ├── MessageService.cs       ← Messages + LibreTranslate
│   ├── MonetizationService.cs  ← GiftService + CoinService + VipService
│   ├── PresenceModerationService.cs ← Redis presence + block/report
│   ├── LiveKitService.cs       ← JWT token generation for LiveKit
│   ├── MatchService.cs         ← Redis queue + matching algorithm
│   └── MinioStorageService.cs  ← MinIO file upload
│
├── Hubs/Hubs.cs           ← ChatHub + MatchHub + NotificationHub
└── Controllers/Controllers.cs  ← كل الـ REST endpoints
```

---

## خطوات التشغيل

### 1. انسخ ملف البيئة
```bash
cp .env.example .env
```

### 2. شغّل كل الخدمات
```bash
docker compose up -d
```

### 3. تشغيل مع Dev tools (PgAdmin + RedisInsight)
```bash
docker compose --profile dev up -d
```

---

## الخدمات والمنافذ

| الخدمة | URL | الاستخدام |
|--------|-----|-----------|
| **API** | http://localhost:5000 | ASP.NET Core 10 |
| **Swagger** | http://localhost:5000 | API Documentation |
| **PostgreSQL** | localhost:5432 | قاعدة البيانات |
| **Redis** | localhost:6379 | Cache + Presence + Backplane |
| **LiveKit** | ws://localhost:7880 | WebRTC Server |
| **MinIO** | http://localhost:9000 | Object Storage |
| **MinIO Console** | http://localhost:9001 | Web UI للملفات |
| **LibreTranslate** | http://localhost:5001 | Translation API |
| **PgAdmin** | http://localhost:8080 | DB Management (dev) |
| **RedisInsight** | http://localhost:8001 | Redis GUI (dev) |

---

## SignalR Hubs

```
ws://localhost:5000/hubs/chat         ← Real-time messaging
ws://localhost:5000/hubs/match        ← Random video matching
ws://localhost:5000/hubs/notifications ← Push notifications
```

**المصادقة:** أرسل JWT token في query string:
```
?access_token=eyJ...
```

---

## أمثلة API

### تسجيل حساب جديد
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"أحمد","age":25,"gender":0}'
```

### دخول الطابور العشوائي (SignalR)
```javascript
const connection = new HubConnectionBuilder()
  .withUrl("/hubs/match?access_token=YOUR_JWT")
  .build();

connection.on("MatchFound", (data) => {
  // data.liveKitToken + data.roomName + data.matchedUser
});

await connection.invoke("JoinQueue", { preferredGender: null, minAge: 18, maxAge: 60 });
```

---

## EF Core Migrations

لاستخدام migrations بدلاً من EnsureCreated:
```bash
# داخل Docker
docker exec qablny-api dotnet ef migrations add InitialCreate
docker exec qablny-api dotnet ef database update
```
