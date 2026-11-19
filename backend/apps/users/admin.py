from django.contrib import admin
from apps.users.models import User, RefreshToken, UserBlock, Report, Notification

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'coins', 'level', 'is_vip', 'is_online', 'is_blocked', 'joined_at')
    search_fields = ('name', 'email')
    list_filter = ('is_vip', 'is_online', 'is_blocked', 'gender')

@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'is_revoked', 'expires_at', 'created_at')

@admin.register(UserBlock)
class UserBlockAdmin(admin.ModelAdmin):
    list_display = ('id', 'blocker_id', 'blocked_user_id', 'created_at')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter_id', 'reported_user_id', 'status', 'created_at')
    list_filter = ('status',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
