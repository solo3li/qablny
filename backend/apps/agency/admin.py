from django.contrib import admin
from apps.agency.models import Agency, AgencyManager, PayoutRequest

@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'invite_code', 'agency_cut_percentage', 'target_coins', 'total_earnings', 'is_active')
    list_filter = ('is_active',)

@admin.register(AgencyManager)
class AgencyManagerAdmin(admin.ModelAdmin):
    list_display = ('id', 'agency_id', 'username', 'full_name', 'is_active')

@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'agency_id', 'amount', 'status', 'created_at', 'processed_at')
    list_filter = ('status',)
