"""Register and login endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.bidder import Bidder
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse, UserLogin, UserOut, UserRegister
from app.services import audit_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    bidder_id = None
    if payload.role == UserRole.BIDDER:
        if not all(
            [
                payload.legal_name,
                payload.registered_address,
                payload.state,
                payload.pincode,
                payload.contact_phone,
            ]
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bidder registration requires legal name, address, state, PIN, and phone",
            )
        bidder = Bidder(
            legal_name=payload.legal_name,
            registered_address=payload.registered_address or "",
            state=payload.state or "",
            pincode=payload.pincode or "",
            contact_email=payload.email.lower(),
            contact_phone=payload.contact_phone or "",
        )
        db.add(bidder)
        db.flush()
        bidder_id = bidder.id

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        bidder_id=bidder_id,
    )
    db.add(user)
    db.flush()
    audit_service.record(
        db,
        action="user.register",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=user.id,
        detail=f"Registered {user.role.value} account for {user.email}",
    )
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id), user.role.value)
    return TokenResponse(access_token=token, role=user.role, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    audit_service.record(
        db,
        action="user.login",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=user.id,
        detail=f"Successful login as {user.role.value}",
    )
    db.commit()
    token = create_access_token(str(user.id), user.role.value)
    return TokenResponse(access_token=token, role=user.role, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
