import uuid
from django.db import models
from django.utils import timezone

class Friendship(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    requester_id = models.UUIDField(db_column='RequesterId')
    addressee_id = models.UUIDField(db_column='AddresseeId')
    status = models.IntegerField(db_column='Status', default=0)  # 0: Pending, 1: Accepted, 2: Blocked
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    updated_at = models.DateTimeField(db_column='UpdatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Friendships'
        unique_together = (('requester_id', 'addressee_id'),)

class Conversation(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user1_id = models.UUIDField(db_column='User1Id')
    user2_id = models.UUIDField(db_column='User2Id')
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    last_message_at = models.DateTimeField(db_column='LastMessageAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Conversations'
        unique_together = (('user1_id', 'user2_id'),)

class Message(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    conversation_id = models.UUIDField(db_column='ConversationId')
    sender_id = models.UUIDField(db_column='SenderId')
    receiver_id = models.UUIDField(db_column='ReceiverId')
    type = models.IntegerField(db_column='Type', default=0)
    content = models.TextField(db_column='Content', blank=True, null=True)
    translation = models.TextField(db_column='Translation', blank=True, null=True)
    duration_seconds = models.IntegerField(db_column='DurationSeconds', blank=True, null=True)
    media_url = models.TextField(db_column='MediaUrl', blank=True, null=True)
    location_name = models.TextField(db_column='LocationName', blank=True, null=True)
    location_lat = models.FloatField(db_column='LocationLat', blank=True, null=True)
    location_lng = models.FloatField(db_column='LocationLng', blank=True, null=True)
    is_read = models.BooleanField(db_column='IsRead', default=False)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Messages'

    def to_dto_dict(self, current_user_id: uuid.UUID) -> dict:
        media_url = self.media_url
        if self.type == 8 and self.is_read and self.receiver_id == current_user_id:
            media_url = None

        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "senderId": self.sender_id,
            "receiverId": self.receiver_id,
            "type": self.type,
            "content": self.content,
            "translation": self.translation,
            "durationSeconds": self.duration_seconds,
            "mediaUrl": media_url,
            "locationName": self.location_name,
            "locationLat": self.location_lat,
            "locationLng": self.location_lng,
            "isRead": self.is_read,
            "createdAt": self.created_at,
            "isMe": self.sender_id == current_user_id,
        }

class Streak(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user1_id = models.UUIDField(db_column='User1Id')
    user2_id = models.UUIDField(db_column='User2Id')
    streak_count = models.IntegerField(db_column='StreakCount', default=0)
    user1_last_sent_at = models.DateTimeField(db_column='User1LastSentAt', null=True, blank=True)
    user2_last_sent_at = models.DateTimeField(db_column='User2LastSentAt', null=True, blank=True)
    last_interaction_at = models.DateTimeField(db_column='LastInteractionAt', null=True, blank=True)
    expires_at = models.DateTimeField(db_column='ExpiresAt', null=True, blank=True)
    is_broken = models.BooleanField(db_column='IsBroken', default=False)
    last_sender_id = models.UUIDField(db_column='LastSenderId', null=True, blank=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    updated_at = models.DateTimeField(db_column='UpdatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Streaks'
        unique_together = (('user1_id', 'user2_id'),)

