"""Create in-app notifications for officers and/or a bidder organisation."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User, UserRole


def notify_users(
    db: Session,
    *,
    kind: str,
    title: str,
    body: str,
    bid_id: int | None = None,
    officer: bool = False,
    bidder_id: int | None = None,
    user_id: int | None = None,
) -> None:
    recipients: list[User] = []
    if user_id:
        user = db.get(User, user_id)
        if user:
            recipients.append(user)
    if officer:
        recipients.extend(list(db.scalars(select(User).where(User.role == UserRole.OFFICER, User.is_active.is_(True)))))
    if bidder_id:
        recipients.extend(list(db.scalars(select(User).where(User.bidder_id == bidder_id, User.is_active.is_(True)))))
    seen: set[int] = set()
    for user in recipients:
        if user.id in seen:
            continue
        seen.add(user.id)
        db.add(Notification(user_id=user.id, title=title, body=body, kind=kind, bid_id=bid_id))
