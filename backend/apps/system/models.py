import uuid
from django.db import models
from django.utils import timezone

class AdminUser(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    username = models.TextField(db_column='Username', unique=True)
    password_hash = models.TextField(db_column='PasswordHash')
    full_name = models.TextField(db_column='FullName')
    role = models.IntegerField(db_column='Role', default=2)  # 0: SuperAdmin, 1: Moderator, 2: Support
    is_active = models.BooleanField(db_column='IsActive', default=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'AdminUsers'

class StaffShift(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    admin_user_id = models.UUIDField(db_column='AdminUserId')
    start_time = models.DateTimeField(db_column='StartTime')
    end_time = models.DateTimeField(db_column='EndTime', blank=True, null=True)
    status = models.TextField(db_column='Status', default='Active')

    class Meta:
        managed = False
        db_table = 'StaffShifts'

class AuditLog(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    admin_user_id = models.UUIDField(db_column='AdminUserId')
    action = models.TextField(db_column='Action')
    details = models.TextField(db_column='Details', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'AuditLogs'

class SystemSetting(models.Model):
    key = models.TextField(db_column='Key', primary_key=True)
    value = models.TextField(db_column='Value')
    description = models.TextField(db_column='Description', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SystemSettings'

class Banner(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    image_url = models.TextField(db_column='ImageUrl')
    link_url = models.TextField(db_column='LinkUrl', blank=True, null=True)
    order = models.IntegerField(db_column='Order', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Banners'

class PushNotificationLog(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    title = models.TextField(db_column='Title')
    body = models.TextField(db_column='Body')
    target_audience = models.TextField(db_column='TargetAudience', default='All')
    sent_count = models.IntegerField(db_column='SentCount', default=0)
    sent_at = models.DateTimeField(db_column='SentAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'PushNotificationLogs'
