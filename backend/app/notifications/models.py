from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database.database import Base


class Notification(Base):
    __tablename__ = "notification"
    __table_args__ = {"schema": "public"}

    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("public.User.user_id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    related_assignment_id = Column(
        Integer,
        ForeignKey("public.study_set_assignment.assignment_id", ondelete="SET NULL"),
        nullable=True,
    )
