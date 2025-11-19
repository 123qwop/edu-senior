from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    DECIMAL,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.database import Base


class StudySet(Base):
    __tablename__ = "studyset"
    __table_args__ = {"schema": "public"}

    set_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100))
    type = Column(String(50), nullable=False)  # 'Flashcards', 'Quiz', 'Problem set'
    level = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey("public.User.user_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_shared = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)

    # Relationships
    questions = relationship("Question", back_populates="study_set", cascade="all, delete-orphan")
    tags = relationship("StudySetTag", back_populates="study_set", cascade="all, delete-orphan")
    assignments = relationship("StudySetAssignment", back_populates="study_set", cascade="all, delete-orphan")
    progress = relationship("StudySetProgress", back_populates="study_set", cascade="all, delete-orphan")


class StudySetTag(Base):
    __tablename__ = "studyset_tags"
    __table_args__ = {"schema": "public"}

    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), primary_key=True)
    tag = Column(String(100), primary_key=True)

    study_set = relationship("StudySet", back_populates="tags")


class Question(Base):
    __tablename__ = "question"
    __table_args__ = {"schema": "public"}

    question_id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), nullable=False)
    type = Column(String(50), nullable=False)  # 'flashcard', 'multiple_choice', 'true_false', 'short_answer', 'problem'
    content = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)

    study_set = relationship("StudySet", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    flashcard = relationship("Flashcard", back_populates="question", uselist=False, cascade="all, delete-orphan")


class QuestionOption(Base):
    __tablename__ = "question_options"
    __table_args__ = {"schema": "public"}

    option_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("public.question.question_id"), nullable=False)
    option_text = Column(Text, nullable=False)
    option_order = Column(Integer, nullable=False)

    question = relationship("Question", back_populates="options")


class Flashcard(Base):
    __tablename__ = "flashcard"
    __table_args__ = {"schema": "public"}

    flashcard_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("public.question.question_id"), nullable=False, unique=True)
    term = Column(Text, nullable=False)
    definition = Column(Text, nullable=False)

    question = relationship("Question", back_populates="flashcard")


class StudySetAssignment(Base):
    __tablename__ = "study_set_assignment"
    __table_args__ = {"schema": "public"}

    assignment_id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), nullable=False)
    class_id = Column(Integer, ForeignKey("public.class.class_id"), nullable=True)
    assigned_by = Column(Integer, ForeignKey("public.User.user_id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)

    study_set = relationship("StudySet", back_populates="assignments")
    student_assignments = relationship("StudySetStudentAssignment", back_populates="assignment", cascade="all, delete-orphan")


class StudySetStudentAssignment(Base):
    __tablename__ = "study_set_student_assignment"
    __table_args__ = {"schema": "public"}

    assignment_id = Column(Integer, ForeignKey("public.study_set_assignment.assignment_id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("public.User.user_id"), primary_key=True)

    assignment = relationship("StudySetAssignment", back_populates="student_assignments")


class StudySetProgress(Base):
    __tablename__ = "study_set_progress"
    __table_args__ = {"schema": "public"}

    progress_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.User.user_id"), nullable=False)
    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), nullable=False)
    mastery_percentage = Column(DECIMAL(5, 2), default=Decimal("0.00"), nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)
    items_completed = Column(Integer, default=0, nullable=False)
    total_items = Column(Integer, default=0, nullable=False)

    study_set = relationship("StudySet", back_populates="progress")


class StudySetOffline(Base):
    __tablename__ = "study_set_offline"
    __table_args__ = {"schema": "public"}

    user_id = Column(Integer, ForeignKey("public.User.user_id"), primary_key=True)
    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), primary_key=True)
    downloaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

