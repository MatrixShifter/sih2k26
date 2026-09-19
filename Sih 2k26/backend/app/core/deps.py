"""FastAPI dependencies for authentication and role checks."""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")
    return user


def require_officer(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.OFFICER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Procurement Officer access required")
    return user


def require_bidder(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.BIDDER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bidder access required")
    return user
