from django.contrib import admin
from apps.monetization.models import Gift, GiftTransaction, CoinTransaction, CoinPackage, VipPlan, VipSubscription

@admin.register(Gift)
class GiftAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'emoji', 'coin_cost', 'is_active')
    list_filter = ('is_active',)

@admin.register(GiftTransaction)
class GiftTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender_id', 'receiver_id', 'gift_id', 'coins_spent', 'created_at')

@admin.register(CoinTransaction)
class CoinTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'amount', 'type', 'created_at')
    list_filter = ('type',)

@admin.register(CoinPackage)
class CoinPackageAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'coins', 'price', 'bonus', 'is_active')

@admin.register(VipPlan)
class VipPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'period', 'duration_days', 'is_best', 'bonus_coins', 'is_active')

@admin.register(VipSubscription)
class VipSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'plan_id', 'price_paid', 'started_at', 'expires_at')
