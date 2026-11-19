from django.contrib import admin
from apps.live.models import LiveRoom

@admin.register(LiveRoom)
class LiveRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'host_id', 'title', 'viewers_count', 'is_active', 'started_at', 'ended_at')
    list_filter = ('is_active',)
