import uuid
from django.db import models
from django.utils import timezone

class MatchSession(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user1_id = models.UUIDField(db_column='User1Id')
    user2_id = models.UUIDField(db_column='User2Id')
    livekit_room_name = models.TextField(db_column='LiveKitRoomName')
    started_at = models.DateTimeField(db_column='StartedAt', default=timezone.now)
    ended_at = models.DateTimeField(db_column='EndedAt', blank=True, null=True)
    skipped_by_user_id = models.UUIDField(db_column='SkippedByUserId', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MatchSessions'
