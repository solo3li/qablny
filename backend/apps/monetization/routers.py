import uuid
import datetime
from decimal import Decimal
from typing import List
from django.db import models
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from apps.monetization.models import Gift, GiftTransaction, CoinTransaction, VipPlan, VipSubscription
from apps.monetization.schemas import (
    GiftDto, SendGiftRequest, CoinBalanceDto, CoinTransactionDto,
    PurchaseCoinsRequest, VipPlanDto, VipStatusDto
)
from apps.users.models import User
from apps.agency.models import Agency
from qablny.auth import AuthBearer
from qablny.centrifugo import publish_to_centrifugo

gifts_router = Router(tags=["Gifts"])
coins_router = Router(tags=["Coins"])
vip_router = Router(tags=["VIP"])

# ── Gifts Endpoints ───────────────────────────────────────────────────────────
@gifts_router.get("", response=List[GiftDto])
@gifts_router.get("/", response=List[GiftDto])
def get_gifts(request):
    gifts = Gift.objects.filter(is_active=True).order_by('coin_cost')
    return [
        {
            "id": g.id,
            "name": g.name,
            "emoji": g.emoji,
            "coinCost": g.coin_cost
        }
        for g in gifts
    ]

@gifts_router.post("/send", response=GiftDto, auth=AuthBearer())
def send_gift(request, req: SendGiftRequest):
    sender_id = request.user_id
    gift = get_object_or_404(Gift, id=req.giftId, is_active=True)
    sender = get_object_or_404(User, id=sender_id)

    if sender.coins < gift.coin_cost:
        raise HttpError(400, "رصيد العملات غير كافٍ")

    # Deduct from sender
    sender.coins -= gift.coin_cost
    sender.save(update_fields=['coins'])

    CoinTransaction.objects.create(
        user_id=sender_id,
        amount=-gift.coin_cost,
        type=4,  # Deduction
        description=f"إرسال هدية: {gift.name}"
    )

    GiftTransaction.objects.create(
        sender_id=sender_id,
        receiver_id=req.receiverId,
        gift_id=gift.id,
        coins_spent=gift.coin_cost
    )

    # Reward receiver with half coins
    receiver = User.objects.filter(id=req.receiverId).first()
    if receiver:
        reward = gift.coin_cost // 2
        receiver.coins += reward
        receiver.save(update_fields=['coins'])
        CoinTransaction.objects.create(
            user_id=req.receiverId,
            amount=reward,
            type=2,  # GiftReceived
            description=f"استلام هدية: {gift.name}"
        )

        # Update Agency Earnings if receiver is a host
        if receiver.agency_id:
            Agency.objects.filter(id=receiver.agency_id).update(
                total_earnings=models.F('total_earnings') + gift.coin_cost
            )

    gift_dto = {
        "id": gift.id,
        "name": gift.name,
        "emoji": gift.emoji,
        "coinCost": gift.coin_cost
    }

    # Publish to receiver via Centrifugo
    publish_to_centrifugo(f"users:{req.receiverId}", "ReceiveGift", {
        "senderId": sender_id,
        "senderName": sender.name,
        "gift": gift_dto
    })

    return gift_dto

# ── Coins Endpoints ───────────────────────────────────────────────────────────
@coins_router.get("/balance", response=CoinBalanceDto, auth=AuthBearer())
def get_coin_balance(request):
    user = get_object_or_404(User, id=request.user_id)
    return {"balance": user.coins}

@coins_router.get("/transactions", response=List[CoinTransactionDto], auth=AuthBearer())
def get_coin_transactions(request, page: int = 1):
    page_size = 20
    offset = (page - 1) * page_size
    txs = CoinTransaction.objects.filter(user_id=request.user_id).order_by('-created_at')[offset:offset + page_size]
    return [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "createdAt": t.created_at
        }
        for t in txs
    ]

@coins_router.post("/purchase", response=CoinBalanceDto, auth=AuthBearer())
def purchase_coins(request, req: PurchaseCoinsRequest):
    if req.amount < 10 or req.amount > 100000:
        raise HttpError(400, "الكمية يجب أن تكون بين 10 و 100,000")

    user = get_object_or_404(User, id=request.user_id)
    user.coins += req.amount
    user.save(update_fields=['coins'])

    CoinTransaction.objects.create(
        user_id=user.id,
        amount=req.amount,
        type=0,  # Purchase
        description="شراء عملات"
    )
    return {"balance": user.coins}

# ── VIP Endpoints ─────────────────────────────────────────────────────────────
@vip_router.get("/plans", response=List[VipPlanDto])
def get_vip_plans(request):
    plans = VipPlan.objects.filter(is_active=True).order_by('price')
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "period": p.period_name,
            "durationDays": p.duration_days,
            "features": p.features_list,
            "isBest": p.is_best,
            "bonusCoins": p.bonus_coins
        }
        for p in plans
    ]

@vip_router.get("/status", response=VipStatusDto, auth=AuthBearer())
def get_vip_status(request):
    user = get_object_or_404(User, id=request.user_id)
    return {
        "isVip": user.is_vip,
        "expiresAt": user.vip_expires_at
    }

@vip_router.post("/subscribe/{plan_id}", auth=AuthBearer())
def subscribe_vip(request, plan_id: uuid.UUID):
    user = get_object_or_404(User, id=request.user_id)
    plan = get_object_or_404(VipPlan, id=plan_id, is_active=True)

    now = timezone.now()
    if user.is_vip and user.vip_expires_at and user.vip_expires_at > now:
        expires_at = user.vip_expires_at + datetime.timedelta(days=plan.duration_days)
    else:
        expires_at = now + datetime.timedelta(days=plan.duration_days)

    user.is_vip = True
    user.vip_expires_at = expires_at
    if plan.bonus_coins > 0:
        user.coins += plan.bonus_coins
    user.save(update_fields=['is_vip', 'vip_expires_at', 'coins'])

    VipSubscription.objects.create(
        user_id=user.id,
        plan_id=plan.id,
        started_at=now,
        expires_at=expires_at,
        price_paid=plan.price
    )

    if plan.bonus_coins > 0:
        CoinTransaction.objects.create(
            user_id=user.id,
            amount=plan.bonus_coins,
            type=3,  # VipReward
            description=f"مكافأة اشتراك {plan.name}"
        )

    return {"message": "VIP subscription successful"}
