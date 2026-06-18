using Qablny.Enums;

namespace Qablny.Entities;

// ─── User ─────────────────────────────────────────────────────────────────────
public class User
{
    public Guid     Id              { get; set; } = Guid.NewGuid();
    public string   Email           { get; set; } = default!;
    public string   PasswordHash    { get; set; } = default!;
    public string   Name            { get; set; } = default!;
    public string?  Bio             { get; set; }
    public string?  ProfileImageUrl { get; set; }
    public int      Age             { get; set; }
    public Gender   Gender          { get; set; }
    public string?  Location        { get; set; }
    public List<string> Interests   { get; set; } = [];
    public int      Coins           { get; set; } = 100;
    public bool     IsVip           { get; set; }
    public DateTime? VipExpiresAt   { get; set; }
    public bool     IsOnline        { get; set; }
    public DateTime LastSeen        { get; set; } = DateTime.UtcNow;
    public DateTime JoinedAt        { get; set; } = DateTime.UtcNow;
    public int      TotalMatches    { get; set; }
    public bool     IsBlocked       { get; set; }
    public string?  ExpoPushToken   { get; set; }

    public ICollection<Friendship>       SentFriendRequests     { get; set; } = [];
    public ICollection<Friendship>       ReceivedFriendRequests { get; set; } = [];
    public ICollection<Message>          SentMessages           { get; set; } = [];
    public ICollection<GiftTransaction>  SentGifts              { get; set; } = [];
    public ICollection<GiftTransaction>  ReceivedGifts          { get; set; } = [];
    public ICollection<CoinTransaction>  CoinTransactions       { get; set; } = [];
    public ICollection<VipSubscription>  VipSubscriptions       { get; set; } = [];
    public ICollection<Report>           FiledReports           { get; set; } = [];
    public ICollection<Report>           ReceivedReports        { get; set; } = [];
    public ICollection<RefreshToken>     RefreshTokens          { get; set; } = [];
}

// ─── Friendship / Conversation / Message ──────────────────────────────────────
public class Friendship
{
    public Guid             Id          { get; set; } = Guid.NewGuid();
    public Guid             RequesterId { get; set; }
    public Guid             AddresseeId { get; set; }
    public FriendshipStatus Status      { get; set; } = FriendshipStatus.Pending;
    public DateTime         CreatedAt   { get; set; } = DateTime.UtcNow;
    public DateTime         UpdatedAt   { get; set; } = DateTime.UtcNow;

    public User Requester { get; set; } = default!;
    public User Addressee { get; set; } = default!;
}

public class Conversation
{
    public Guid     Id            { get; set; } = Guid.NewGuid();
    public Guid     User1Id       { get; set; }
    public Guid     User2Id       { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public User User1 { get; set; } = default!;
    public User User2 { get; set; } = default!;
    public ICollection<Message> Messages { get; set; } = [];
}

public class Message
{
    public Guid         Id              { get; set; } = Guid.NewGuid();
    public Guid         ConversationId  { get; set; }
    public Guid         SenderId        { get; set; }
    public Guid         ReceiverId      { get; set; }
    public MessageType  Type            { get; set; } = MessageType.Text;
    public string?      Content         { get; set; }
    public string?      Translation     { get; set; }
    public int?         DurationSeconds { get; set; }
    public string?      MediaUrl        { get; set; }
    public string?      LocationName    { get; set; }
    public double?      LocationLat     { get; set; }
    public double?      LocationLng     { get; set; }
    public bool         IsRead          { get; set; }
    public DateTime     CreatedAt       { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = default!;
    public User         Sender       { get; set; } = default!;
    public User         Receiver     { get; set; } = default!;
}

// ─── Monetization ─────────────────────────────────────────────────────────────
public class Gift
{
    public Guid   Id       { get; set; } = Guid.NewGuid();
    public string Name     { get; set; } = default!;
    public string Emoji    { get; set; } = default!;
    public int    CoinCost { get; set; }
    public bool   IsActive { get; set; } = true;

    public ICollection<GiftTransaction> Transactions { get; set; } = [];
}

public class GiftTransaction
{
    public Guid     Id         { get; set; } = Guid.NewGuid();
    public Guid     SenderId   { get; set; }
    public Guid     ReceiverId { get; set; }
    public Guid     GiftId     { get; set; }
    public int      CoinsSpent { get; set; }
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;

    public User Sender   { get; set; } = default!;
    public User Receiver { get; set; } = default!;
    public Gift Gift     { get; set; } = default!;
}

public class CoinTransaction
{
    public Guid                Id          { get; set; } = Guid.NewGuid();
    public Guid                UserId      { get; set; }
    public int                 Amount      { get; set; }
    public CoinTransactionType Type        { get; set; }
    public string?             Description { get; set; }
    public DateTime            CreatedAt   { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = default!;
}

public class VipPlan
{
    public Guid          Id          { get; set; } = Guid.NewGuid();
    public string        Name        { get; set; } = default!;
    public decimal       Price       { get; set; }
    public VipPeriod     Period      { get; set; }
    public int           DurationDays{ get; set; }
    public List<string>  Features    { get; set; } = [];
    public bool          IsBest      { get; set; }
    public int           BonusCoins  { get; set; }
    public bool          IsActive    { get; set; } = true;

    public ICollection<VipSubscription> Subscriptions { get; set; } = [];
}

public class VipSubscription
{
    public Guid     Id        { get; set; } = Guid.NewGuid();
    public Guid     UserId    { get; set; }
    public Guid     PlanId    { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public decimal  PricePaid { get; set; }

    public User    User { get; set; } = default!;
    public VipPlan Plan { get; set; } = default!;
}

// ─── Safety ───────────────────────────────────────────────────────────────────
public class MatchSession
{
    public Guid     Id               { get; set; } = Guid.NewGuid();
    public Guid     User1Id          { get; set; }
    public Guid     User2Id          { get; set; }
    public string   LiveKitRoomName  { get; set; } = default!;
    public DateTime StartedAt        { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt         { get; set; }
    public Guid?    SkippedByUserId  { get; set; }

    public User User1 { get; set; } = default!;
    public User User2 { get; set; } = default!;
}

public class Report
{
    public Guid         Id             { get; set; } = Guid.NewGuid();
    public Guid         ReporterId     { get; set; }
    public Guid         ReportedUserId { get; set; }
    public string       Reason         { get; set; } = default!;
    public ReportStatus Status         { get; set; } = ReportStatus.Pending;
    public string?      AdminNote      { get; set; }
    public DateTime     CreatedAt      { get; set; } = DateTime.UtcNow;

    public User Reporter     { get; set; } = default!;
    public User ReportedUser { get; set; } = default!;
}

public class UserBlock
{
    public Guid     Id            { get; set; } = Guid.NewGuid();
    public Guid     BlockerId     { get; set; }
    public Guid     BlockedUserId { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;

    public User Blocker     { get; set; } = default!;
    public User BlockedUser { get; set; } = default!;
}

public class RefreshToken
{
    public Guid     Id        { get; set; } = Guid.NewGuid();
    public Guid     UserId    { get; set; }
    public string   Token     { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public bool     IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = default!;
}

// ─── Admin & Staff ────────────────────────────────────────────────────────────
public class AdminUser
{
    public Guid       Id           { get; set; } = Guid.NewGuid();
    public string     Username     { get; set; } = default!;
    public string     PasswordHash { get; set; } = default!;
    public string     FullName     { get; set; } = default!;
    public AdminRole  Role         { get; set; } = AdminRole.Support;
    public bool       IsActive     { get; set; } = true;
    public DateTime   CreatedAt    { get; set; } = DateTime.UtcNow;

    public ICollection<StaffShift> Shifts    { get; set; } = [];
    public ICollection<AuditLog>   AuditLogs { get; set; } = [];
}

public class StaffShift
{
    public Guid       Id           { get; set; } = Guid.NewGuid();
    public Guid       AdminUserId  { get; set; }
    public DateTime   StartTime    { get; set; }
    public DateTime?  EndTime      { get; set; }
    public string     Status       { get; set; } = "Active"; // Active, Completed, Missed
    
    public AdminUser  AdminUser    { get; set; } = default!;
}

public class AuditLog
{
    public Guid       Id           { get; set; } = Guid.NewGuid();
    public Guid       AdminUserId  { get; set; }
    public string     Action       { get; set; } = default!;
    public string?    Details      { get; set; }
    public DateTime   CreatedAt    { get; set; } = DateTime.UtcNow;

    public AdminUser  AdminUser    { get; set; } = default!;
}

// ─── System & Communications ──────────────────────────────────────────────────
public class SystemSetting
{
    public string     Key          { get; set; } = default!;
    public string     Value        { get; set; } = default!;
    public string?    Description  { get; set; }
}

public class Banner
{
    public Guid       Id           { get; set; } = Guid.NewGuid();
    public string     ImageUrl     { get; set; } = default!;
    public string?    LinkUrl      { get; set; }
    public int        Order        { get; set; }
    public bool       IsActive     { get; set; } = true;
    public DateTime   CreatedAt    { get; set; } = DateTime.UtcNow;
}

public class PushNotificationLog
{
    public Guid       Id             { get; set; } = Guid.NewGuid();
    public string     Title          { get; set; } = default!;
    public string     Body           { get; set; } = default!;
    public string     TargetAudience { get; set; } = "All"; 
    public int        SentCount      { get; set; }
    public DateTime   SentAt         { get; set; } = DateTime.UtcNow;
}
