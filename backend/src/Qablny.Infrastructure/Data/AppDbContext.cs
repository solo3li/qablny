using Microsoft.EntityFrameworkCore;
using Qablny.Domain.Entities;
using System.Text.Json;

namespace Qablny.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Gift> Gifts => Set<Gift>();
    public DbSet<GiftTransaction> GiftTransactions => Set<GiftTransaction>();
    public DbSet<CoinTransaction> CoinTransactions => Set<CoinTransaction>();
    public DbSet<VipPlan> VipPlans => Set<VipPlan>();
    public DbSet<VipSubscription> VipSubscriptions => Set<VipSubscription>();
    public DbSet<MatchSession> MatchSessions => Set<MatchSession>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<UserBlock> UserBlocks => Set<UserBlock>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ── User ──────────────────────────────────────────────────────────
        b.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => new { u.Gender, u.IsVip, u.IsOnline });
            e.Property(u => u.Interests)
             .HasConversion(
                 v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                 v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? []);
        });

        // ── Friendship ─────────────────────────────────────────────────────
        b.Entity<Friendship>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();
            e.HasOne(f => f.Requester).WithMany(u => u.SentFriendRequests)
             .HasForeignKey(f => f.RequesterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Addressee).WithMany(u => u.ReceivedFriendRequests)
             .HasForeignKey(f => f.AddresseeId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Conversation ───────────────────────────────────────────────────
        b.Entity<Conversation>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasIndex(c => new { c.User1Id, c.User2Id }).IsUnique();
            e.HasOne(c => c.User1).WithMany()
             .HasForeignKey(c => c.User1Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.User2).WithMany()
             .HasForeignKey(c => c.User2Id).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Message ────────────────────────────────────────────────────────
        b.Entity<Message>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => new { m.ConversationId, m.CreatedAt });
            e.HasOne(m => m.Sender).WithMany(u => u.SentMessages)
             .HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.Receiver).WithMany()
             .HasForeignKey(m => m.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Gift ───────────────────────────────────────────────────────────
        b.Entity<Gift>(e => e.HasKey(g => g.Id));

        // ── GiftTransaction ────────────────────────────────────────────────
        b.Entity<GiftTransaction>(e =>
        {
            e.HasKey(gt => gt.Id);
            e.HasOne(gt => gt.Sender).WithMany(u => u.SentGifts)
             .HasForeignKey(gt => gt.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(gt => gt.Receiver).WithMany(u => u.ReceivedGifts)
             .HasForeignKey(gt => gt.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── CoinTransaction ────────────────────────────────────────────────
        b.Entity<CoinTransaction>(e =>
        {
            e.HasKey(ct => ct.Id);
            e.HasOne(ct => ct.User).WithMany(u => u.CoinTransactions)
             .HasForeignKey(ct => ct.UserId);
        });

        // ── VipPlan ────────────────────────────────────────────────────────
        b.Entity<VipPlan>(e =>
        {
            e.HasKey(v => v.Id);
            e.Property(v => v.Features)
             .HasConversion(
                 v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                 v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? []);
        });

        // ── VipSubscription ────────────────────────────────────────────────
        b.Entity<VipSubscription>(e =>
        {
            e.HasKey(vs => vs.Id);
            e.HasOne(vs => vs.User).WithMany(u => u.VipSubscriptions)
             .HasForeignKey(vs => vs.UserId);
        });

        // ── MatchSession ───────────────────────────────────────────────────
        b.Entity<MatchSession>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasOne(m => m.User1).WithMany()
             .HasForeignKey(m => m.User1Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.User2).WithMany()
             .HasForeignKey(m => m.User2Id).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Report ─────────────────────────────────────────────────────────
        b.Entity<Report>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.Reporter).WithMany(u => u.FiledReports)
             .HasForeignKey(r => r.ReporterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.ReportedUser).WithMany(u => u.ReceivedReports)
             .HasForeignKey(r => r.ReportedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── UserBlock ──────────────────────────────────────────────────────
        b.Entity<UserBlock>(e =>
        {
            e.HasKey(ub => ub.Id);
            e.HasIndex(ub => new { ub.BlockerId, ub.BlockedUserId }).IsUnique();
            e.HasOne(ub => ub.Blocker).WithMany()
             .HasForeignKey(ub => ub.BlockerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ub => ub.BlockedUser).WithMany()
             .HasForeignKey(ub => ub.BlockedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── RefreshToken ───────────────────────────────────────────────────
        b.Entity<RefreshToken>(e =>
        {
            e.HasKey(rt => rt.Id);
            e.HasOne(rt => rt.User).WithMany(u => u.RefreshTokens)
             .HasForeignKey(rt => rt.UserId);
        });

        // ── Seed Data ──────────────────────────────────────────────────────
        SeedData(b);
    }

    private static void SeedData(ModelBuilder b)
    {
        var giftId1 = new Guid("11111111-0000-0000-0000-000000000001");
        var giftId2 = new Guid("11111111-0000-0000-0000-000000000002");
        var giftId3 = new Guid("11111111-0000-0000-0000-000000000003");
        var giftId4 = new Guid("11111111-0000-0000-0000-000000000004");
        var giftId5 = new Guid("11111111-0000-0000-0000-000000000005");
        var giftId6 = new Guid("11111111-0000-0000-0000-000000000006");
        var giftId7 = new Guid("11111111-0000-0000-0000-000000000007");
        var giftId8 = new Guid("11111111-0000-0000-0000-000000000008");

        b.Entity<Gift>().HasData(
            new Gift { Id = giftId1, Name = "وردة",   Emoji = "🌹", CoinCost = 10  },
            new Gift { Id = giftId2, Name = "قلب",    Emoji = "❤️", CoinCost = 20  },
            new Gift { Id = giftId3, Name = "تاج",    Emoji = "👑", CoinCost = 50  },
            new Gift { Id = giftId4, Name = "الماس",  Emoji = "💎", CoinCost = 100 },
            new Gift { Id = giftId5, Name = "نجمة",   Emoji = "⭐", CoinCost = 30  },
            new Gift { Id = giftId6, Name = "كيك",    Emoji = "🎂", CoinCost = 25  },
            new Gift { Id = giftId7, Name = "هدية",   Emoji = "🎁", CoinCost = 40  },
            new Gift { Id = giftId8, Name = "صاروخ",  Emoji = "🚀", CoinCost = 150 }
        );

        var planId1 = new Guid("22222222-0000-0000-0000-000000000001");
        var planId2 = new Guid("22222222-0000-0000-0000-000000000002");
        var planId3 = new Guid("22222222-0000-0000-0000-000000000003");

        b.Entity<VipPlan>().HasData(
            new VipPlan
            {
                Id = planId1, Name = "أسبوعي", Price = 19, Period = Domain.Enums.VipPeriod.Weekly,
                DurationDays = 7, IsBest = false, BonusCoins = 0,
                Features = ["فلترة حسب الجنس", "إخفاء الإعلانات", "شارة VIP"]
            },
            new VipPlan
            {
                Id = planId2, Name = "شهري", Price = 49, Period = Domain.Enums.VipPeriod.Monthly,
                DurationDays = 30, IsBest = true, BonusCoins = 500,
                Features = ["كل مميزات الأسبوعي", "اختيار المنطقة", "أولوية في المطابقة", "500 عملة مجاناً"]
            },
            new VipPlan
            {
                Id = planId3, Name = "سنوي", Price = 299, Period = Domain.Enums.VipPeriod.Yearly,
                DurationDays = 365, IsBest = false, BonusCoins = 5000,
                Features = ["كل الميزات", "5000 عملة مجاناً", "دعم أولوية 24/7", "بث مباشر"]
            }
        );
    }
}
