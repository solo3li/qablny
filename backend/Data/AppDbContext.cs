using Microsoft.EntityFrameworkCore;
using Qablny.Entities;
using Qablny.Enums;
using System.Text.Json;

namespace Qablny.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>            Users            => Set<User>();
    public DbSet<Friendship>      Friendships      => Set<Friendship>();
    public DbSet<Conversation>    Conversations    => Set<Conversation>();
    public DbSet<Message>         Messages         => Set<Message>();
    public DbSet<Gift>            Gifts            => Set<Gift>();
    public DbSet<GiftTransaction> GiftTransactions => Set<GiftTransaction>();
    public DbSet<CoinTransaction> CoinTransactions => Set<CoinTransaction>();
    public DbSet<VipPlan>         VipPlans         => Set<VipPlan>();
    public DbSet<VipSubscription> VipSubscriptions => Set<VipSubscription>();
    public DbSet<MatchSession>    MatchSessions    => Set<MatchSession>();
    public DbSet<Report>          Reports          => Set<Report>();
    public DbSet<UserBlock>       UserBlocks       => Set<UserBlock>();
    public DbSet<RefreshToken>    RefreshTokens    => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        var jsonOpts = JsonSerializerOptions.Default;

        // User
        b.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => new { u.Gender, u.IsVip, u.IsOnline });
            e.Property(u => u.Interests)
             .HasConversion(
                 v  => JsonSerializer.Serialize(v, jsonOpts),
                 v  => JsonSerializer.Deserialize<List<string>>(v, jsonOpts) ?? new List<string>());
        });

        // Friendship
        b.Entity<Friendship>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();
            e.HasOne(f => f.Requester).WithMany(u => u.SentFriendRequests)
             .HasForeignKey(f => f.RequesterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Addressee).WithMany(u => u.ReceivedFriendRequests)
             .HasForeignKey(f => f.AddresseeId).OnDelete(DeleteBehavior.Restrict);
        });

        // Conversation
        b.Entity<Conversation>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasIndex(c => new { c.User1Id, c.User2Id }).IsUnique();
            e.HasOne(c => c.User1).WithMany()
             .HasForeignKey(c => c.User1Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.User2).WithMany()
             .HasForeignKey(c => c.User2Id).OnDelete(DeleteBehavior.Restrict);
        });

        // Message
        b.Entity<Message>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => new { m.ConversationId, m.CreatedAt });
            e.HasOne(m => m.Sender).WithMany(u => u.SentMessages)
             .HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.Receiver).WithMany()
             .HasForeignKey(m => m.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        // GiftTransaction
        b.Entity<GiftTransaction>(e =>
        {
            e.HasOne(gt => gt.Sender).WithMany(u => u.SentGifts)
             .HasForeignKey(gt => gt.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(gt => gt.Receiver).WithMany(u => u.ReceivedGifts)
             .HasForeignKey(gt => gt.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        });

        // CoinTransaction
        b.Entity<CoinTransaction>(e =>
            e.HasOne(ct => ct.User).WithMany(u => u.CoinTransactions)
             .HasForeignKey(ct => ct.UserId));

        // VipPlan
        b.Entity<VipPlan>(e =>
        {
            e.Property(v => v.Features)
             .HasConversion(
                 v  => JsonSerializer.Serialize(v, jsonOpts),
                 v  => JsonSerializer.Deserialize<List<string>>(v, jsonOpts) ?? new List<string>());
        });

        // VipSubscription
        b.Entity<VipSubscription>(e =>
        {
            e.HasOne(vs => vs.User).WithMany(u => u.VipSubscriptions)
             .HasForeignKey(vs => vs.UserId);
        });

        // MatchSession
        b.Entity<MatchSession>(e =>
        {
            e.HasOne(m => m.User1).WithMany()
             .HasForeignKey(m => m.User1Id).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.User2).WithMany()
             .HasForeignKey(m => m.User2Id).OnDelete(DeleteBehavior.Restrict);
        });

        // Report
        b.Entity<Report>(e =>
        {
            e.HasOne(r => r.Reporter).WithMany(u => u.FiledReports)
             .HasForeignKey(r => r.ReporterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.ReportedUser).WithMany(u => u.ReceivedReports)
             .HasForeignKey(r => r.ReportedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // UserBlock
        b.Entity<UserBlock>(e =>
        {
            e.HasIndex(ub => new { ub.BlockerId, ub.BlockedUserId }).IsUnique();
            e.HasOne(ub => ub.Blocker).WithMany()
             .HasForeignKey(ub => ub.BlockerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ub => ub.BlockedUser).WithMany()
             .HasForeignKey(ub => ub.BlockedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // RefreshToken
        b.Entity<RefreshToken>(e =>
            e.HasOne(rt => rt.User).WithMany(u => u.RefreshTokens)
             .HasForeignKey(rt => rt.UserId));

        // ── Seed Data ──────────────────────────────────────────────────────
        SeedGifts(b);
        SeedVipPlans(b);
    }

    private static void SeedGifts(ModelBuilder b) => b.Entity<Gift>().HasData(
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000001"), Name = "وردة",  Emoji = "🌹", CoinCost = 10  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000002"), Name = "قلب",   Emoji = "❤️", CoinCost = 20  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000003"), Name = "تاج",   Emoji = "👑", CoinCost = 50  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000004"), Name = "الماس", Emoji = "💎", CoinCost = 100 },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000005"), Name = "نجمة",  Emoji = "⭐", CoinCost = 30  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000006"), Name = "كيك",   Emoji = "🎂", CoinCost = 25  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000007"), Name = "هدية",  Emoji = "🎁", CoinCost = 40  },
        new Gift { Id = Guid.Parse("11111111-0000-0000-0000-000000000008"), Name = "صاروخ", Emoji = "🚀", CoinCost = 150 }
    );

    private static void SeedVipPlans(ModelBuilder b) => b.Entity<VipPlan>().HasData(
        new VipPlan
        {
            Id = Guid.Parse("22222222-0000-0000-0000-000000000001"),
            Name = "أسبوعي", Price = 19, Period = VipPeriod.Weekly,
            DurationDays = 7, IsBest = false, BonusCoins = 0,
            Features = ["فلترة حسب الجنس", "إخفاء الإعلانات", "شارة VIP"]
        },
        new VipPlan
        {
            Id = Guid.Parse("22222222-0000-0000-0000-000000000002"),
            Name = "شهري", Price = 49, Period = VipPeriod.Monthly,
            DurationDays = 30, IsBest = true, BonusCoins = 500,
            Features = ["كل مميزات الأسبوعي", "اختيار المنطقة", "أولوية في المطابقة", "500 عملة مجاناً"]
        },
        new VipPlan
        {
            Id = Guid.Parse("22222222-0000-0000-0000-000000000003"),
            Name = "سنوي", Price = 299, Period = VipPeriod.Yearly,
            DurationDays = 365, IsBest = false, BonusCoins = 5000,
            Features = ["كل الميزات", "5000 عملة مجاناً", "دعم أولوية 24/7", "بث مباشر"]
        }
    );
}
