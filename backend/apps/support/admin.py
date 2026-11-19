from django.contrib import admin
from apps.support.models import SupportTicket, SupportMessage

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'subject', 'status', 'created_at', 'updated_at')
    list_filter = ('status',)

@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket_id', 'sender_id', 'is_admin', 'type', 'created_at')
    list_filter = ('is_admin', 'type')
