import uuid
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from ninja import Schema

class GiftDto(Schema):
    id: uuid.UUID
    name: str
    emoji: str
    coinCost: int

class SendGiftRequest(Schema):
    giftId: uuid.UUID
    receiverId: uuid.UUID

class CoinBalanceDto(Schema):
    balance: int

class CoinTransactionDto(Schema):
    id: uuid.UUID
    amount: int
    type: int
    description: Optional[str] = None
    createdAt: datetime

class PurchaseCoinsRequest(Schema):
    amount: int

class VipPlanDto(Schema):
    id: uuid.UUID
    name: str
    price: Decimal
    period: str
    durationDays: int
    features: List[str]
    isBest: bool
    bonusCoins: int

class VipStatusDto(Schema):
    isVip: bool
    expiresAt: Optional[datetime] = None
