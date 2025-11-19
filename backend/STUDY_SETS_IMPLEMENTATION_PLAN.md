# Study Sets/Materials Backend Implementation Plan

## Current Database State

### Existing Tables:
- ✅ `studyset` - Basic table exists with: `set_id`, `title`, `subject`, `creator_id`
- ✅ `question` - Exists with: `question_id`, `set_id`, `type`, `content`, `correct_answer`
- ✅ `class` - Exists for class management
- ✅ `enrollment` - Exists for student enrollments
- ✅ `versionhistory` - Exists for version tracking
- ✅ `attempt` - Exists for tracking user attempts/scores

## Required Database Changes

### 1. **Update `studyset` table** - Add missing fields:

```sql
ALTER TABLE public.studyset
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'Quiz' CHECK (type IN ('Flashcards', 'Quiz', 'Problem set')),
ADD COLUMN IF NOT EXISTS level VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
```

**Note:** We'll need a migration for this. Consider using Alembic.

### 2. **Create `studyset_tags` junction table** (many-to-many):

```sql
CREATE TABLE IF NOT EXISTS public.studyset_tags (
    set_id INTEGER NOT NULL REFERENCES public.studyset(set_id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (set_id, tag)
);

CREATE INDEX IF NOT EXISTS index_studyset_tags_set ON public.studyset_tags(set_id);
CREATE INDEX IF NOT EXISTS index_studyset_tags_tag ON public.studyset_tags(tag);
```

### 3. **Update `question` table** - Support different question types:

The current `question` table has:
- `question_id`, `set_id`, `type`, `content`, `correct_answer`

**For Flashcards:**
- `content` can store JSON: `{"term": "...", "definition": "..."}`
- OR create separate `flashcard` table

**For Quiz (Multiple Choice):**
- `content` stores question text
- `correct_answer` stores the option index (1-4)
- Need to store options separately

**For Problem Set:**
- `content` stores problem statement
- `correct_answer` stores solution/steps

**Option A: Use JSON in existing columns** (simpler, less normalized)
**Option B: Create separate tables** (more normalized, better for queries)

**Recommended: Create separate tables for better data integrity:**

```sql
-- For multiple choice options
CREATE TABLE IF NOT EXISTS public.question_options (
    option_id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES public.question(question_id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL CHECK (option_order BETWEEN 1 AND 4)
);

CREATE INDEX IF NOT EXISTS index_question_options_question ON public.question_options(question_id);

-- For flashcards (if we want separate table instead of JSON)
CREATE TABLE IF NOT EXISTS public.flashcard (
    flashcard_id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES public.question(question_id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_flashcard_question ON public.flashcard(question_id);
```

### 4. **Create `study_set_assignment` table** (for assigning sets to classes/students):

```sql
CREATE TABLE IF NOT EXISTS public.study_set_assignment (
    assignment_id SERIAL PRIMARY KEY,
    set_id INTEGER NOT NULL REFERENCES public.studyset(set_id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES public.class(class_id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES public."User"(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    UNIQUE(set_id, class_id)
);

CREATE INDEX IF NOT EXISTS index_assignment_set ON public.study_set_assignment(set_id);
CREATE INDEX IF NOT EXISTS index_assignment_class ON public.study_set_assignment(class_id);

-- For individual student assignments (when not assigning to entire class)
CREATE TABLE IF NOT EXISTS public.study_set_student_assignment (
    assignment_id INTEGER NOT NULL REFERENCES public.study_set_assignment(assignment_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public."User"(user_id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS index_student_assignment_user ON public.study_set_student_assignment(user_id);
```

### 5. **Create `study_set_progress` table** (for tracking student progress):

```sql
CREATE TABLE IF NOT EXISTS public.study_set_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."User"(user_id) ON DELETE CASCADE,
    set_id INTEGER NOT NULL REFERENCES public.studyset(set_id) ON DELETE CASCADE,
    mastery_percentage DECIMAL(5,2) DEFAULT 0 CHECK (mastery_percentage BETWEEN 0 AND 100),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    items_completed INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    UNIQUE(user_id, set_id)
);

CREATE INDEX IF NOT EXISTS index_progress_user_set ON public.study_set_progress(user_id, set_id);
```

### 6. **Create `study_set_offline` table** (for tracking downloaded sets):

```sql
CREATE TABLE IF NOT EXISTS public.study_set_offline (
    user_id INTEGER NOT NULL REFERENCES public."User"(user_id) ON DELETE CASCADE,
    set_id INTEGER NOT NULL REFERENCES public.studyset(set_id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, set_id)
);

CREATE INDEX IF NOT EXISTS index_offline_user ON public.study_set_offline(user_id);
```

## Backend Implementation

### 1. **Create SQLAlchemy Models** (`app/study_sets/models.py`):

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, DECIMAL, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.database import Base

class StudySet(Base):
    __tablename__ = "studyset"
    __table_args__ = {"schema": "public"}
    
    set_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100))
    type = Column(String(50), nullable=False)  # 'Flashcards', 'Quiz', 'Problem set'
    level = Column(String(50))
    description = Column(Text)
    creator_id = Column(Integer, ForeignKey("public.User.user_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_shared = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
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
    class_id = Column(Integer, ForeignKey("public.class.class_id"))
    assigned_by = Column(Integer, ForeignKey("public.User.user_id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    
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
    mastery_percentage = Column(DECIMAL(5, 2), default=0)
    last_activity = Column(DateTime, default=datetime.utcnow)
    items_completed = Column(Integer, default=0)
    total_items = Column(Integer, default=0)

class StudySetOffline(Base):
    __tablename__ = "study_set_offline"
    __table_args__ = {"schema": "public"}
    
    user_id = Column(Integer, ForeignKey("public.User.user_id"), primary_key=True)
    set_id = Column(Integer, ForeignKey("public.studyset.set_id"), primary_key=True)
    downloaded_at = Column(DateTime, default=datetime.utcnow)
```

### 2. **Create Pydantic Schemas** (`app/study_sets/schemas.py`):

```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class StudySetCreate(BaseModel):
    title: str
    subject: str
    type: str  # 'Flashcards', 'Quiz', 'Problem set'
    level: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    initialItem: Optional[dict] = None  # For the first item
    assignment: Optional[dict] = None  # For assignment info

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
    type: str
    content: str
    correct_answer: str
    options: Optional[List[str]] = None  # For multiple choice
    term: Optional[str] = None  # For flashcards
    definition: Optional[str] = None  # For flashcards
    problem: Optional[str] = None  # For problem sets
    solution: Optional[str] = None  # For problem sets
```

### 3. **Create API Routes** (`app/study_sets/routes.py`):

Required endpoints:
- `GET /study-sets` - List study sets (with filters)
- `POST /study-sets` - Create study set
- `GET /study-sets/{set_id}` - Get study set details
- `PUT /study-sets/{set_id}` - Update study set
- `DELETE /study-sets/{set_id}` - Delete study set
- `POST /study-sets/{set_id}/assign` - Assign to class/students
- `GET /study-sets/{set_id}/questions` - Get questions in set
- `POST /study-sets/{set_id}/questions` - Add question
- `PUT /study-sets/{set_id}/questions/{question_id}` - Update question
- `DELETE /study-sets/{set_id}/questions/{question_id}` - Delete question
- `POST /study-sets/{set_id}/offline` - Mark as downloaded
- `DELETE /study-sets/{set_id}/offline` - Remove from offline
- `GET /classes` - Get classes (for assignment dropdown)

## Summary of Changes Needed

### Database:
1. ✅ Add columns to `studyset` table (type, level, description, timestamps, flags)
2. ✅ Create `studyset_tags` junction table
3. ✅ Create `question_options` table for multiple choice
4. ✅ Create `flashcard` table (optional, can use JSON instead)
5. ✅ Create `study_set_assignment` table
6. ✅ Create `study_set_student_assignment` table
7. ✅ Create `study_set_progress` table
8. ✅ Create `study_set_offline` table

### Backend:
1. ✅ Create SQLAlchemy models
2. ✅ Create Pydantic schemas
3. ✅ Create API routes
4. ✅ Add router to `main.py`
5. ✅ Implement business logic for CRUD operations
6. ✅ Implement filtering, sorting, search
7. ✅ Implement assignment logic
8. ✅ Implement progress tracking

### Frontend:
1. ✅ Update API calls in `authApi.ts` or create `studySetsApi.ts`
2. ✅ Connect CreateStudySetDialog to backend
3. ✅ Connect StudySets page to backend
4. ✅ Handle loading states and errors

## Migration Strategy

1. **Create Alembic migration** for all database changes
2. **Test migration** on development database
3. **Update models** in SQLAlchemy
4. **Implement backend routes** incrementally
5. **Update frontend** to use real API endpoints
6. **Test end-to-end** functionality

