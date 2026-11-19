import uuid
from typing import List
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from apps.support.models import SupportTicket, SupportMessage
from apps.support.schemas import (
    CreateTicketRequest, SupportTicketDto, SupportMessageDto, SendSupportMessageRequest
)
from apps.users.models import User
from qablny.auth import AuthBearer
from qablny.centrifugo import publish_to_centrifugo
from qablny.push import send_expo_push

support_router = Router(tags=["Support"])

@support_router.post("/tickets", response=SupportTicketDto, auth=AuthBearer())
def create_ticket(request, req: CreateTicketRequest):
    ticket = SupportTicket.objects.create(
        user_id=request.user_id,
        subject=req.subject,
        status="Open"
    )
    if req.message:
        SupportMessage.objects.create(
            ticket_id=ticket.id,
            sender_id=request.user_id,
            is_admin=False,
            type=0,
            content=req.message
        )
    return {
        "id": ticket.id,
        "userId": ticket.user_id,
        "subject": ticket.subject,
        "status": ticket.status,
        "createdAt": ticket.created_at,
        "updatedAt": ticket.updated_at
    }

@support_router.get("/tickets", response=List[SupportTicketDto], auth=AuthBearer())
def get_user_tickets(request):
    tickets = SupportTicket.objects.filter(user_id=request.user_id).order_by('-updated_at')
    return [
        {
            "id": t.id,
            "userId": t.user_id,
            "subject": t.subject,
            "status": t.status,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
        }
        for t in tickets
    ]

@support_router.get("/tickets/all", response=List[SupportTicketDto])
def get_all_tickets(request):
    tickets = SupportTicket.objects.all().order_by('-updated_at')
    return [
        {
            "id": t.id,
            "userId": t.user_id,
            "subject": t.subject,
            "status": t.status,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
        }
        for t in tickets
    ]

@support_router.get("/tickets/{ticket_id}/messages", response=List[SupportMessageDto])
def get_ticket_messages(request, ticket_id: uuid.UUID):
    messages = SupportMessage.objects.filter(ticket_id=ticket_id).order_by('created_at')
    return [
        {
            "id": m.id,
            "ticketId": m.ticket_id,
            "senderId": m.sender_id,
            "isAdmin": m.is_admin,
            "type": m.type,
            "content": m.content,
            "durationSeconds": m.duration_seconds,
            "mediaUrl": m.media_url,
            "createdAt": m.created_at
        }
        for m in messages
    ]

@support_router.post("/tickets/{ticket_id}/close", response=SupportTicketDto, auth=AuthBearer())
def close_ticket(request, ticket_id: uuid.UUID):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    ticket.status = "Closed"
    ticket.updated_at = timezone.now()
    ticket.save(update_fields=['status', 'updated_at'])
    return {
        "id": ticket.id,
        "userId": ticket.user_id,
        "subject": ticket.subject,
        "status": ticket.status,
        "createdAt": ticket.created_at,
        "updatedAt": ticket.updated_at
    }

@support_router.post("/tickets/{ticket_id}/messages", response=SupportMessageDto, auth=AuthBearer())
def send_support_message(request, ticket_id: uuid.UUID, req: SendSupportMessageRequest):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    text_content = req.content if req.content is not None else req.message
    msg = SupportMessage.objects.create(
        ticket_id=ticket.id,
        sender_id=request.user_id,
        is_admin=req.isAdmin,
        type=req.type,
        content=text_content,
        duration_seconds=req.durationSeconds,
        media_url=req.mediaUrl
    )
    ticket.updated_at = timezone.now()
    if ticket.status == "Closed":
        ticket.status = "Open"
    ticket.save(update_fields=['status', 'updated_at'])

    dto = {
        "id": msg.id,
        "ticketId": msg.ticket_id,
        "senderId": msg.sender_id,
        "isAdmin": msg.is_admin,
        "type": msg.type,
        "content": msg.content,
        "durationSeconds": msg.duration_seconds,
        "mediaUrl": msg.media_url,
        "createdAt": msg.created_at
    }

    # Publish to ticket channel via Centrifugo
    publish_to_centrifugo(f"tickets:{ticket.id}", "ReceiveSupportMessage", dto)

    # Push Notification if admin replied
    if req.isAdmin:
        user = User.objects.filter(id=ticket.user_id).first()
        if user and user.expo_push_token:
            body = req.content if req.type == 0 else f"أرسل لك الدعم الفني محتوى ({req.type})"
            send_expo_push(user.expo_push_token, "رد من الدعم الفني", body or "رسالة جديدة", {"type": "support", "ticketId": str(ticket.id)})

    return dto
