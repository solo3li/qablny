import uuid
import json
from django.db import models
from django.utils import timezone

class Gift(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    name = models.TextField(db_column='Name')
    emoji = models.TextField(db_column='Emoji')
    coin_cost = models.IntegerField(db_column='CoinCost')
    is_active = models.BooleanField(db_column='IsActive', default=True)

    class Meta:
        managed = False
        db_table = 'Gifts'

class GiftTransaction(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    sender_id = models.UUIDField(db_column='SenderId')
    receiver_id = models.UUIDField(db_column='ReceiverId')
    gift_id = models.UUIDField(db_column='GiftId')
    coins_spent = models.IntegerField(db_column='CoinsSpent')
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'GiftTransactions'

class CoinTransaction(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField(db_column='UserId')
    amount = models.IntegerField(db_column='Amount')
    type = models.IntegerField(db_column='Type')  # 0: Purchase, 1: GiftSent, 2: GiftReceived, 3: VipReward, 4: Deduction
    description = models.TextField(db_column='Description', blank=True, null=True)
    created_at = models.DateTimeField(db_column='CreatedAt', default=timezone.now)

    class Meta:
        managed = False
        db_table = 'CoinTransactions'

class CoinPackage(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    name = models.TextField(db_column='Name')
    coins = models.IntegerField(db_column='Coins')
    price = models.DecimalField(db_column='Price', max_digits=12, decimal_places=2)
    bonus = models.IntegerField(db_column='Bonus', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)

    class Meta:
        managed = False
        db_table = 'CoinPackages'

class VipPlan(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    name = models.TextField(db_column='Name')
    price = models.DecimalField(db_column='Price', max_digits=12, decimal_places=2)
    period = models.IntegerField(db_column='Period')  # 0: Weekly, 1: Monthly, 2: Yearly
    duration_days = models.IntegerField(db_column='DurationDays')
    features = models.TextField(db_column='Features', default='[]')
    is_best = models.BooleanField(db_column='IsBest', default=False)
    bonus_coins = models.IntegerField(db_column='BonusCoins', default=0)
    is_active = models.BooleanField(db_column='IsActive', default=True)

    class Meta:
        managed = False
        db_table = 'VipPlans'

    @property
    def features_list(self) -> list[str]:
        try:
            return json.loads(self.features) if self.features else []
        except Exception:
            return []

    @property
    def period_name(self) -> str:
        names = {0: "Weekly", 1: "Monthly", 2: "Yearly"}
        return names.get(self.period, "Monthly")

class VipSubscription(models.Model):
    id = models.UUIDField(db_column='Id', primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField(db_column='UserId')
    plan_id = models.UUIDField(db_column='PlanId')
    started_at = models.DateTimeField(db_column='StartedAt', default=timezone.now)
    expires_at = models.DateTimeField(db_column='ExpiresAt')
    price_paid = models.DecimalField(db_column='PricePaid', max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'VipSubscriptions'
