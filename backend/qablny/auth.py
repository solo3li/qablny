import uuid
import datetime
import bcrypt
import jwt
from django.conf import settings
from ninja.security import HttpBearer
from apps.users.models import User

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=11)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=['HS256'],
            options={'verify_aud': False, 'verify_iss': False}
        )
    except Exception:
        return None

def create_access_token(user: User) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + datetime.timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    claims = {
        'sub': str(user.id),
        'email': user.email,
        'name': user.name,
        'isVip': str(user.is_vip).lower(),
        'jti': str(uuid.uuid4()),
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
        'iss': settings.JWT_ISSUER,
        'aud': settings.JWT_AUDIENCE,
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm='HS256')

def create_agency_access_token(manager) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + datetime.timedelta(days=1)
    claims = {
        'sub': str(manager.id),
        'AgencyId': str(manager.agency_id),
        'role': 'AgencyManager',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'AgencyManager',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': str(manager.id),
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
        'iss': settings.JWT_ISSUER,
        'aud': settings.JWT_AUDIENCE,
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm='HS256')

class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256'],
                options={'verify_aud': False, 'verify_iss': False}
            )
            user_id = payload.get('sub')
            if not user_id:
                return None
            request.user_id = uuid.UUID(user_id)
            request.user_claims = payload
            return payload
        except Exception:
            return None

class AgencyBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256'],
                options={'verify_aud': False, 'verify_iss': False}
            )
            role = payload.get('role') or payload.get('http://schemas.microsoft.com/ws/2008/06/identity/claims/role')
            if role != 'AgencyManager':
                return None
            agency_id = payload.get('AgencyId')
            manager_id = payload.get('sub') or payload.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier')
            if not agency_id:
                return None
            request.agency_id = uuid.UUID(agency_id)
            request.manager_id = uuid.UUID(manager_id) if manager_id else None
            request.agency_claims = payload
            return payload
        except Exception:
            return None
