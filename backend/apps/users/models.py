import uuid
import json
from django.db import models
from django.utils import timezone

class User(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    email = models.TextField(db_column='Email', unique=True)
    password_hash = models.TextField(db_column='PasswordHash')
    name = models.TextField(db_column='Name')
    bio = models.TextField(db_column='Bio', blank=True, null=True)
    profile_image_url = models.TextField(db_column='ProfileImageUrl', blank=True, null=True)
    age = models.IntegerField(db_column='Age')
    gender = models.IntegerField(db_column='Gender')  # 0: Male, 1: Female
    location = models.TextField(db_column='Location', blank=True, null=True)
    interests = models.TextField(db_column='Interests', default='[]')
    coins = models.IntegerField(db_column='Coins', default=100)
    is_vip = models.BooleanField(db_column='IsVip', default=False)
    vip_expires_at = models.DateTimeField(db_column='VipExpiresAt', blank=True, null=True)
    is_online = models.BooleanField(db_column='IsOnline', default=False)
    last_seen = models.DateTimeField(db_column='LastSeen', default=timezone.now)
    joined_at = models.DateTimeField(db_column='JoinedAt', default=timezone.now)
    total_matches = models.IntegerField(db_column='TotalMatches', default=0)
    is_blocked = models.BooleanField(db_column='IsBlocked', default=False)
    expo_push_token = models.TextField(db_column='ExpoPushToken', blank=True, null=True)
    agency_id = models.UUIDField(db_column='AgencyId', blank=True, null=True)
    level = models.IntegerField(db_column='Level', default=1)
    vip_level = models.IntegerField(db_column='VipLevel', default=0)
    xp = models.IntegerField(db_column='XP', default=0)
    is_profile_image_approved = models.BooleanField(db_column='IsProfileImageApproved', default=False)

    class Meta:
        managed = False
        db_table = 'Users'

    @property
    def interests_list(self) -> list[str]:
        try:
            return json.loads(self.interests) if self.interests else []
        except Exception:
            return []

    def set_interests(self, items: list[str]):
        self.interests = json.dumps(items or [])

    def to_dto_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "bio": self.bio,
            "profileImageUrl": self.profile_image_url,
            "age": self.age,
            "gender": self.gender,
            "location": self.location,
            "interests": self.interests_list,
            "coins": self.coins,
            "isVip": self.is_vip,
            "isOnline": self.is_online,
            "lastSeen": self.last_seen.isoformat() if self.last_seen else "",
            "joinedAt": self.joined_at.isoformat() if self.joined_at else "",
            "totalMatches": self.total_matches,
            "level": self.level,
            "xp": self.xp,
            "vipLevel": self.vip_level,
        }

class RefreshToken(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField(db_column='UserId')
    token = models.TextField(db_column='Token')
    expires_at = models.DateTimeField(db_column='ExpiresAt')
    is_revoked = models.BooleanField(db_column='IsRevoked', default=False)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'RefreshTokens'

class UserBlock(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    blocker_id = models.UUIDField(db_column='BlockerId')
    blocked_user_id = models.UUIDField(db_column='BlockedUserId')
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'UserBlocks'
        unique_together = (('blocker_id', 'blocked_user_id'),)

class Report(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    reporter_id = models.UUIDField(db_column='ReporterId')
    reported_user_id = models.UUIDField(db_column='ReportedUserId')
    reason = models.TextField(db_column='Reason')
    status = models.IntegerField(db_column='Status', default=0) # 0: Pending, 1: Reviewed, 2: ActionTaken, 3: Dismissed
    admin_note = models.TextField(db_column='AdminNote', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Reports'

class Notification(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField(db_column='UserId')
    type = models.TextField(db_column='Type')
    title = models.TextField(db_column='Title')
    body = models.TextField(db_column='Body')
    is_read = models.BooleanField(db_column='IsRead', default=False)
    image_url = models.TextField(db_column='ImageUrl', blank=True, null=True)
    action_id = models.TextField(db_column='ActionId', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Notifications'
