import uuid
from django.db import models
from django.utils import timezone

class SupportTicket(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField(db_column='UserId')
    subject = models.TextField(db_column='Subject')
    status = models.TextField(db_column='Status', default='Open')
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    updated_at = models.DateTimeField(db_column='UpdatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'SupportTickets'

class SupportMessage(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    ticket_id = models.UUIDField(db_column='TicketId')
    sender_id = models.UUIDField(db_column='SenderId')
    is_admin = models.BooleanField(db_column='IsAdmin', default=False)
    type = models.IntegerField(db_column='Type', default=0)
    content = models.TextField(db_column='Content', blank=True, null=True)
    duration_seconds = models.IntegerField(db_column='DurationSeconds', blank=True, null=True)
    media_url = models.TextField(db_column='MediaUrl', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'SupportMessages'
