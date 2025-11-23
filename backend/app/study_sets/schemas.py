from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class StudySetCreate(BaseModel):
    title: str
    subject: str
    type: str  # 'Flashcards', 'Quiz', 'Problem set'
    level: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    initialItem: Optional[dict] = None  # For the first item
    assignment: Optional[dict] = None  # For assignment info


class StudySetUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    type: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_shared: Optional[bool] = None
    is_public: Optional[bool] = None


class StudySetOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    type: str
    level: Optional[str]
    description: Optional[str]
    creator_id: int
    created_at: datetime
    updated_at: datetime
    item_count: int
    tags: List[str]
    is_assigned: bool
    is_downloaded: bool
    mastery: Optional[float] = None

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    type: str  # 'flashcard', 'multiple_choice', 'true_false', 'short_answer', 'problem'
    content: str
    correct_answer: str
    options: Optional[List[str]] = None  # For multiple choice
    term: Optional[str] = None  # For flashcards
    definition: Optional[str] = None  # For flashcards
    problem: Optional[str] = None  # For problem sets
    solution: Optional[str] = None  # For problem sets


class QuestionOut(BaseModel):
    id: int
    set_id: int
    type: str
    content: str
    correct_answer: str
    options: Optional[List[str]] = None
    term: Optional[str] = None
    definition: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    class_id: Optional[int] = None
    assign_to_all: bool = True
    student_ids: Optional[List[int]] = None
    due_date: Optional[datetime] = None


class ClassOut(BaseModel):
    id: int
    class_name: str
    teacher_id: int
    subject: Optional[str] = None
    level: Optional[str] = None
    student_count: Optional[int] = 0
    assignment_count: Optional[int] = 0
    average_mastery: Optional[float] = None

    class Config:
        from_attributes = True


class ClassCreate(BaseModel):
    class_name: str
    subject: str
    level: Optional[str] = None
    description: Optional[str] = None


class ClassUpdate(BaseModel):
    class_name: Optional[str] = None
    subject: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None


class AddStudentsRequest(BaseModel):
    student_ids: List[int]


class CreateAssignmentRequest(BaseModel):
    set_id: int
    due_date: Optional[datetime] = None


class DashboardStats(BaseModel):
    questions_answered: Optional[int] = None
    accuracy: Optional[float] = None
    time_spent: Optional[int] = None
    active_students: Optional[int] = None
    assignments_submitted: Optional[int] = None
    classes_active: Optional[int] = None


class DashboardAssignment(BaseModel):
    id: int
    title: str
    due: Optional[str] = None
    status: str
    set_id: int


class Recommendation(BaseModel):
    topic: str
    reason: str
    difficulty: str
    set_id: int


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    points: int


class LeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardEntry]
    current_user_rank: Optional[LeaderboardEntry] = None


class Badge(BaseModel):
    name: str
    icon: str


class NextBadge(BaseModel):
    name: str
    progress: int
    target: int


class StreaksResponse(BaseModel):
    streak: int
    badges: List[Badge]
    next_badge: Optional[NextBadge] = None


class RecordProgressRequest(BaseModel):
    answers: dict


class StudySetAnalytics(BaseModel):
    set_id: int
    title: str
    total_students: int
    average_mastery: float
    completion_rate: float
    total_attempts: int


class StudentProgress(BaseModel):
    set_id: int
    title: str
    subject: Optional[str] = None
    mastery_percentage: float
    items_completed: int
    total_items: int
    last_activity: Optional[str] = None
    attempts: int


class AnalyticsResponse(BaseModel):
    study_sets: List[StudySetAnalytics]
    total_students: int
    average_mastery: float
    total_assignments: int


class ProgressResponse(BaseModel):
    study_sets: List[StudentProgress]
    total_mastery: float
    total_items_completed: int
    total_items: int

