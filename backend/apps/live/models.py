import uuid
from django.db import models
from django.utils import timezone

class LiveRoom(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    host_id = models.UUIDField(db_column='HostId')
    livekit_room_name = models.TextField(db_column='LiveKitRoomName')
    title = models.TextField(db_column='Title')
    cover_image_url = models.TextField(db_column='CoverImageUrl', blank=True, null=True)
    viewers_count = models.IntegerField(db_column='ViewersCount', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)
    started_at = models.DateTimeField(db_column='StartedAt', default=timezone.now)
    ended_at = models.DateTimeField(db_column='EndedAt', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LiveRooms'
