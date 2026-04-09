"""REST + WebSocket for notifications."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from sqlalchemy import and_, func
from sqlalchemy.orm import Session
from datetime import datetime

from starlette.websockets import WebSocketDisconnect

from app.auth.deps import get_current_user
from app.auth.models import User
from app.database.database import get_db
from app.notifications.models import Notification as NotificationModel
from app.notifications.schemas import NotificationListResponse, NotificationOut, WsTicketResponse
from app.notifications.ws_manager import manager as ws_manager
from app.notifications import ws_ticket

router = APIRouter()


@router.get("/ws-ticket", response_model=WsTicketResponse)
def get_ws_ticket(current_user: User = Depends(get_current_user)):
    """Short-lived ticket for opening /notifications/ws (httpOnly cookies are not sent reliably on WS)."""
    t = ws_ticket.issue_ticket(current_user.user_id)
    return WsTicketResponse(ticket=t, expires_in=120)


@router.websocket("/ws")
async def notifications_websocket(
    websocket: WebSocket,
    ticket: str = Query(...),
):
    user_id = ws_ticket.consume_ticket(ticket)
    if user_id is None:
        await websocket.close(code=4401)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(user_id, websocket)


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(NotificationModel).filter(NotificationModel.user_id == current_user.user_id)
    if unread_only:
        q = q.filter(NotificationModel.read_at.is_(None))
    rows = q.order_by(NotificationModel.created_at.desc()).limit(limit).all()

    unread = (
        db.query(func.count())
        .select_from(NotificationModel)
        .filter(
            and_(
                NotificationModel.user_id == current_user.user_id,
                NotificationModel.read_at.is_(None),
            )
        )
        .scalar()
        or 0
    )

    items = [
        NotificationOut(
            id=r.notification_id,
            title=r.title,
            body=r.body,
            category=r.category,
            created_at=r.created_at,
            read_at=r.read_at,
        )
        for r in rows
    ]
    return NotificationListResponse(items=items, unread_count=int(unread))


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(NotificationModel)
        .filter(
            and_(
                NotificationModel.notification_id == notification_id,
                NotificationModel.user_id == current_user.user_id,
            )
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")

    if row.read_at is None:
        row.read_at = datetime.utcnow()
        db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == current_user.user_id,
            NotificationModel.read_at.is_(None),
        )
    ).update({NotificationModel.read_at: now}, synchronize_session=False)
    db.commit()
    return {"ok": True}
