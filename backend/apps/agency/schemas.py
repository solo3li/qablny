import uuid
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from ninja import Schema

class AgencyLoginRequest(Schema):
    username: str
    password: str

class AgencyAuthResponse(Schema):
    token: str
    agencyId: uuid.UUID
    agencyName: str
    managerName: str
    inviteCode: str

class AgencyDashboardDto(Schema):
    agencyName: str
    activeHosts: int
    totalHosts: int
    totalEarnings: int
    agencyCut: int
    monthlyTarget: int
    currentProgress: int

class AgencyHostDto(Schema):
    id: uuid.UUID
    name: str
    status: str
    earnings: int
    matches: int
    joinedDate: str

class AgencyTransactionDto(Schema):
    id: uuid.UUID
    type: str
    hostName: str
    amount: int
    date: str

class PayoutRequestDto(Schema):
    id: uuid.UUID
    amount: Decimal
    status: str
    adminNote: Optional[str] = None
    createdAt: datetime
    processedAt: Optional[datetime] = None

class CreatePayoutRequest(Schema):
    amount: Decimal
