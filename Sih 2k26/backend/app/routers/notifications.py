"""In-app notification centre."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import raise_api
from app.models.notification import Notification
from app.models.user import User
from app.schemas.domain import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(40)
        )
    )


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Notification:
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user.id:
        raise_api(404, "NOTIFICATION_NOT_FOUND", "The requested notification could not be found.")
    row.is_read = True
    db.commit()
    db.refresh(row)
    return row
