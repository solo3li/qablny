from django.contrib import admin
from apps.system.models import AdminUser, StaffShift, AuditLog, SystemSetting, Banner, PushNotificationLog

@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'full_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')

@admin.register(StaffShift)
class StaffShiftAdmin(admin.ModelAdmin):
    list_display = ('id', 'admin_user_id', 'start_time', 'end_time', 'status')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'admin_user_id', 'action', 'created_at')

@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'description')

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('id', 'image_url', 'order', 'is_active', 'created_at')
    list_filter = ('is_active',)

@admin.register(PushNotificationLog)
class PushNotificationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'target_audience', 'sent_count', 'sent_at')
