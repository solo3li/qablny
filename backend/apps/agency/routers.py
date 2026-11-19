import uuid
from typing import List
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from apps.agency.models import Agency, AgencyManager, PayoutRequest
from apps.agency.schemas import (
    AgencyLoginRequest, AgencyAuthResponse, AgencyDashboardDto,
    AgencyHostDto, AgencyTransactionDto, PayoutRequestDto, CreatePayoutRequest
)
from apps.users.models import User
from apps.monetization.models import CoinTransaction
from qablny.auth import verify_password, create_agency_access_token, AgencyBearer
from qablny.inngest_client import inngest_client
import inngest

agency_router = Router(tags=["Agency"])

@agency_router.post("/login", response=AgencyAuthResponse)
def agency_login(request, req: AgencyLoginRequest):
    u = (req.username or "").strip()
    p = (req.password or "").strip()
    manager = AgencyManager.objects.filter(username__iexact=u).first()
    if not manager or not verify_password(p, manager.password_hash):
        raise HttpError(401, "Invalid credentials")

    if not manager.is_active:
        raise HttpError(401, "Account is disabled")

    agency = Agency.objects.filter(id=manager.agency_id, is_active=True).first()
    if not agency:
        raise HttpError(401, "Agency is disabled")

    token = create_agency_access_token(manager)
    return {
        "token": token,
        "agencyId": agency.id,
        "agencyName": agency.name,
        "managerName": manager.full_name,
        "inviteCode": agency.invite_code
    }

@agency_router.get("/dashboard", response=AgencyDashboardDto, auth=AgencyBearer())
def get_dashboard(request):
    agency = get_object_or_404(Agency, id=request.agency_id)
    hosts = list(User.objects.filter(agency_id=agency.id))

    total_hosts = len(hosts)
    active_hosts = sum(1 for h in hosts if h.is_online)
    total_earnings = sum(h.coins for h in hosts)
    agency_cut = int(total_earnings * (agency.agency_cut_percentage / 100.0))

    return {
        "agencyName": agency.name,
        "activeHosts": active_hosts,
        "totalHosts": total_hosts,
        "totalEarnings": total_earnings,
        "agencyCut": agency_cut,
        "monthlyTarget": agency.target_coins,
        "currentProgress": total_earnings
    }

@agency_router.get("/hosts", response=List[AgencyHostDto], auth=AgencyBearer())
def get_hosts(request):
    hosts = User.objects.filter(agency_id=request.agency_id)
    return [
        {
            "id": h.id,
            "name": h.name,
            "status": "Online" if h.is_online else "Offline",
            "earnings": h.coins,
            "matches": h.total_matches,
            "joinedDate": h.joined_at.strftime("%Y-%m-%d") if h.joined_at else ""
        }
        for h in hosts
    ]

@agency_router.post("/hosts/{host_id}/remove", auth=AgencyBearer())
def remove_host(request, host_id: uuid.UUID):
    host = User.objects.filter(id=host_id, agency_id=request.agency_id).first()
    if host:
        host.agency_id = None
        host.save(update_fields=['agency_id'])
    return {"message": "Host removed"}

@agency_router.get("/payouts", response=List[PayoutRequestDto], auth=AgencyBearer())
def get_payouts(request):
    payouts = PayoutRequest.objects.filter(agency_id=request.agency_id).order_by('-created_at')
    return [
        {
            "id": p.id,
            "amount": p.amount,
            "status": p.status,
            "adminNote": p.admin_note,
            "createdAt": p.created_at,
            "processedAt": p.processed_at
        }
        for p in payouts
    ]

@agency_router.post("/payouts", response=PayoutRequestDto, auth=AgencyBearer())
def request_payout(request, req: CreatePayoutRequest):
    pr = PayoutRequest.objects.create(
        agency_id=request.agency_id,
        amount=req.amount,
        status="Pending"
    )

    # Trigger Inngest workflow in background
    try:
        inngest_client.send_sync(
            inngest.Event(
                name="agency/payout.process",
                data={"payoutId": str(pr.id)}
            )
        )
    except Exception:
        pass

    return {
        "id": pr.id,
        "amount": pr.amount,
        "status": pr.status,
        "adminNote": pr.admin_note,
        "createdAt": pr.created_at,
        "processedAt": pr.processed_at
    }

@agency_router.get("/transactions", response=List[AgencyTransactionDto], auth=AgencyBearer())
def get_agency_transactions(request):
    host_ids = list(User.objects.filter(agency_id=request.agency_id).values_list('id', flat=True))
    txs = CoinTransaction.objects.filter(user_id__in=host_ids).order_by('-created_at')[:50]
    users_map = {u.id: u.name for u in User.objects.filter(id__in=host_ids)}

    type_names = {0: "Purchase", 1: "GiftSent", 2: "GiftReceived", 3: "VipReward", 4: "Deduction"}
    return [
        {
            "id": t.id,
            "type": type_names.get(t.type, "Transaction"),
            "hostName": users_map.get(t.user_id, "Host"),
            "amount": t.amount,
            "date": t.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for t in txs
    ]
