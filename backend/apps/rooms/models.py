import uuid
from django.db import models
from django.utils import timezone

class VoiceRoom(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    host_id = models.UUIDField(db_column='HostId')
    livekit_room_name = models.TextField(db_column='LiveKitRoomName')
    title = models.TextField(db_column='Title')
    category = models.TextField(db_column='Category', default='chat')
    cover_image_url = models.TextField(db_column='CoverImageUrl', blank=True, null=True)
    password_hash = models.TextField(db_column='PasswordHash', blank=True, null=True)
    has_password = models.BooleanField(db_column='HasPassword', default=False)
    listeners_count = models.IntegerField(db_column='ListenersCount', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    ended_at = models.DateTimeField(db_column='EndedAt', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'VoiceRooms'

class VoiceRoomSeat(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    room_id = models.UUIDField(db_column='RoomId')
    seat_index = models.IntegerField(db_column='SeatIndex')  # 1 to 8
    user_id = models.UUIDField(db_column='UserId', blank=True, null=True)
    is_locked = models.BooleanField(db_column='IsLocked', default=False)
    is_muted = models.BooleanField(db_column='IsMuted', default=False)
    updated_at = models.DateTimeField(db_column='UpdatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'VoiceRoomSeats'
