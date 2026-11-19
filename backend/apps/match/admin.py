from django.contrib import admin
from apps.match.models import MatchSession

@admin.register(MatchSession)
class MatchSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1_id', 'user2_id', 'livekit_room_name', 'started_at', 'ended_at')
