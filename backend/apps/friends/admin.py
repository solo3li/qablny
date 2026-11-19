from django.contrib import admin
from apps.friends.models import Friendship, Conversation, Message

@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('id', 'requester_id', 'addressee_id', 'status', 'created_at', 'updated_at')
    list_filter = ('status',)

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1_id', 'user2_id', 'last_message_at', 'created_at')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation_id', 'sender_id', 'receiver_id', 'type', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
