import uuid
from django.db import models
from django.utils import timezone

class Agency(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    name = models.TextField(db_column='Name')
    invite_code = models.TextField(db_column='InviteCode', unique=True)
    agency_cut_percentage = models.IntegerField(db_column='AgencyCutPercentage', default=20)
    target_coins = models.IntegerField(db_column='TargetCoins', default=100000)
    total_earnings = models.IntegerField(db_column='TotalEarnings', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'Agencies'

class AgencyManager(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    agency_id = models.UUIDField(db_column='AgencyId')
    username = models.TextField(db_column='Username', unique=True)
    password_hash = models.TextField(db_column='PasswordHash')
    full_name = models.TextField(db_column='FullName')
    is_active = models.BooleanField(db_column='IsActive', default=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'AgencyManagers'

class PayoutRequest(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    agency_id = models.UUIDField(db_column='AgencyId')
    amount = models.DecimalField(db_column='Amount', max_digits=12, decimal_places=2)
    status = models.TextField(db_column='Status', default='Pending')
    admin_note = models.TextField(db_column='AdminNote', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)
    processed_at = models.DateTimeField(db_column='ProcessedAt', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'PayoutRequests'
