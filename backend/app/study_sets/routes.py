from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, text, select
from datetime import datetime
from decimal import Decimal

from app.auth.deps import get_current_user
from app.auth.models import User
from app.database.database import get_db
from app.study_sets import models, schemas

router = APIRouter()


@router.get("/study-sets", response_model=List[schemas.StudySetOut])
def get_study_sets(
    search: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    ownership: Optional[str] = Query(None),
    sort: Optional[str] = Query("recently-used"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get study sets with filtering and sorting"""
    query = db.query(models.StudySet)

    # Access control: Enforce visibility rules based on user role
    is_student = current_user.role and current_user.role.name.lower() == "student"
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"

    if is_student:
        # Students can only see:
        # 1. Their own sets (created by them)
        # 2. Teacher sets that are assigned to them (via individual assignment or class assignment)
        
        # Get sets assigned directly to the student
        directly_assigned_set_ids = (
            db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)
            .subquery()
        )
        
        # Get classes the student is enrolled in
        enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
        enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
        enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
        
        # Build conditions
        conditions = [models.StudySet.creator_id == current_user.user_id]  # Own sets
        
        # Directly assigned sets
        conditions.append(models.StudySet.set_id.in_(db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)))
        
        # Class-assigned sets (if student is enrolled in any classes)
        if enrolled_class_ids:
            conditions.append(models.StudySet.set_id.in_(
                db.query(models.StudySetAssignment.set_id)
                .filter(models.StudySetAssignment.class_id.in_(enrolled_class_ids))
            ))
        
        query = query.filter(or_(*conditions))
        
    elif is_teacher:
        # Teachers can see:
        # 1. Their own sets
        # 2. Sets shared with them (if is_shared is True and not created by them)
        query = query.filter(
            or_(
                models.StudySet.creator_id == current_user.user_id,  # Own sets
                and_(
                    models.StudySet.is_shared == True,
                    models.StudySet.creator_id != current_user.user_id,  # Shared by others
                ),
            )
        )

    # Filter by ownership
    if ownership == "Mine":
        query = query.filter(models.StudySet.creator_id == current_user.user_id)
    elif ownership == "Shared with me":
        # Get sets shared with user (via assignments or shared flag)
        # Exclude sets created by the current user
        assigned_set_ids = (
            db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)
            .subquery()
        )
        query = query.filter(
            and_(
                models.StudySet.creator_id != current_user.user_id,  # Exclude own sets
                or_(
                    models.StudySet.set_id.in_(assigned_set_ids),
                    models.StudySet.is_shared == True,
                ),
            )
        )
    elif ownership == "Assigned":
        # Get sets assigned to user
        assigned_set_ids = (
            db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)
            .subquery()
        )
        query = query.filter(models.StudySet.set_id.in_(assigned_set_ids))

    # Filter by subject
    if subject:
        query = query.filter(models.StudySet.subject == subject)

    # Filter by type
    if type:
        query = query.filter(models.StudySet.type == type)

    # Search
    if search:
        query = query.filter(
            or_(
                models.StudySet.title.ilike(f"%{search}%"),
                models.StudySet.subject.ilike(f"%{search}%"),
                models.StudySet.description.ilike(f"%{search}%"),
            )
        )

    # Sort
    if sort == "recently-used":
        # Join with progress to sort by last_activity
        query = query.outerjoin(
            models.StudySetProgress,
            and_(
                models.StudySetProgress.set_id == models.StudySet.set_id,
                models.StudySetProgress.user_id == current_user.user_id,
            ),
        ).order_by(models.StudySetProgress.last_activity.desc().nullslast(), models.StudySet.updated_at.desc())
    elif sort == "recently-created":
        query = query.order_by(models.StudySet.created_at.desc())
    elif sort == "a-z":
        query = query.order_by(models.StudySet.title.asc())
    elif sort == "recommended":
        # Join with AI suggestions or assignments
        query = query.order_by(models.StudySet.is_shared.desc(), models.StudySet.created_at.desc())

    study_sets = query.all()

    # Build response with additional data
    result = []
    for study_set in study_sets:
        # Get item count
        item_count = db.query(func.count(models.Question.question_id)).filter(
            models.Question.set_id == study_set.set_id
        ).scalar() or 0

        # Get tags
        tags = [tag.tag for tag in study_set.tags]

        # Check if assigned
        is_assigned = (
            db.query(models.StudySetAssignment)
            .filter(models.StudySetAssignment.set_id == study_set.set_id)
            .first()
            is not None
        )

        # Check if downloaded
        is_downloaded = (
            db.query(models.StudySetOffline)
            .filter(
                and_(
                    models.StudySetOffline.set_id == study_set.set_id,
                    models.StudySetOffline.user_id == current_user.user_id,
                )
            )
            .first()
            is not None
        )

        # Get mastery
        progress = (
            db.query(models.StudySetProgress)
            .filter(
                and_(
                    models.StudySetProgress.set_id == study_set.set_id,
                    models.StudySetProgress.user_id == current_user.user_id,
                )
            )
            .first()
        )
        mastery = float(progress.mastery_percentage) if progress else None

        result.append(
            schemas.StudySetOut(
                id=study_set.set_id,
                title=study_set.title,
                subject=study_set.subject,
                type=study_set.type,
                level=study_set.level,
                description=study_set.description,
                creator_id=study_set.creator_id,
                created_at=study_set.created_at,
                updated_at=study_set.updated_at,
                item_count=item_count,
                tags=tags,
                is_assigned=is_assigned,
                is_downloaded=is_downloaded,
                mastery=mastery,
            )
        )

    return result


@router.post("/study-sets", response_model=schemas.StudySetOut, status_code=status.HTTP_201_CREATED)
def create_study_set(
    payload: schemas.StudySetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new study set"""
    # Create study set
    # Determine if set should be shared based on creator role
    is_student = current_user.role and current_user.role.name.lower() == "student"
    is_shared = payload.assignment is not None if not is_student else False  # Students' sets are never shared
    
    study_set = models.StudySet(
        title=payload.title,
        subject=payload.subject,
        type=payload.type,
        level=payload.level,
        description=payload.description,
        creator_id=current_user.user_id,
        is_shared=is_shared,  # Only teachers can create shared sets (when assigned)
        is_public=False,  # Never public by default
    )
    db.add(study_set)
    db.flush()  # Get the set_id

    # Add tags
    if payload.tags:
        for tag in payload.tags:
            study_set_tag = models.StudySetTag(set_id=study_set.set_id, tag=tag)
            db.add(study_set_tag)

    # Add initial item if provided
    if payload.initialItem:
        question = None
        if payload.type == "Flashcards":
            question = models.Question(
                set_id=study_set.set_id,
                type="flashcard",
                content=payload.initialItem.get("term", ""),
                correct_answer=payload.initialItem.get("definition", ""),
            )
            db.add(question)
            db.flush()
            flashcard = models.Flashcard(
                question_id=question.question_id,
                term=payload.initialItem.get("term", ""),
                definition=payload.initialItem.get("definition", ""),
            )
            db.add(flashcard)
        elif payload.type == "Quiz":
            question_type = payload.initialItem.get("questionType", "multiple_choice")
            question = models.Question(
                set_id=study_set.set_id,
                type=question_type.lower().replace(" ", "_"),
                content=payload.initialItem.get("question", ""),
                correct_answer=str(payload.initialItem.get("correctAnswer", "")),
            )
            db.add(question)
            db.flush()
            if question_type == "Multiple choice" and payload.initialItem.get("options"):
                for idx, option_text in enumerate(payload.initialItem["options"], 1):
                    option = models.QuestionOption(
                        question_id=question.question_id,
                        option_text=option_text,
                        option_order=idx,
                    )
                    db.add(option)
        elif payload.type == "Problem set":
            question = models.Question(
                set_id=study_set.set_id,
                type="problem",
                content=payload.initialItem.get("problem", ""),
                correct_answer=payload.initialItem.get("solution", ""),
            )
            db.add(question)

    # Handle assignment if provided
    if payload.assignment and payload.assignment.get("classId"):
        assignment = models.StudySetAssignment(
            set_id=study_set.set_id,
            class_id=payload.assignment["classId"],
            assigned_by=current_user.user_id,
            due_date=payload.assignment.get("dueDate"),
        )
        db.add(assignment)
        db.flush()

        if not payload.assignment.get("assignToAll", True):
            # Assign to specific students
            if payload.assignment.get("studentIds"):
                for student_id in payload.assignment["studentIds"]:
                    student_assignment = models.StudySetStudentAssignment(
                        assignment_id=assignment.assignment_id,
                        user_id=student_id,
                    )
                    db.add(student_assignment)
        # If assignToAll is True, all students in the class are assigned (handled by enrollment)

    db.commit()
    db.refresh(study_set)

    # Return study set with full details
    item_count = db.query(func.count(models.Question.question_id)).filter(
        models.Question.set_id == study_set.set_id
    ).scalar() or 0
    tags = [tag.tag for tag in study_set.tags]

    return schemas.StudySetOut(
        id=study_set.set_id,
        title=study_set.title,
        subject=study_set.subject,
        type=study_set.type,
        level=study_set.level,
        description=study_set.description,
        creator_id=study_set.creator_id,
        created_at=study_set.created_at,
        updated_at=study_set.updated_at,
        item_count=item_count,
        tags=tags,
        is_assigned=False,
        is_downloaded=False,
        mastery=None,
    )


@router.get("/study-sets/{set_id}", response_model=schemas.StudySetOut)
def get_study_set(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific study set"""
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")

    # Access control: Enforce visibility rules based on user role
    is_student = current_user.role and current_user.role.name.lower() == "student"
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    
    has_access = False
    
    if is_student:
        # Students can access:
        # 1. Their own sets
        if study_set.creator_id == current_user.user_id:
            has_access = True
        else:
            # 2. Sets assigned to them (directly or via class)
            # Check direct assignment
            direct_assignment = (
                db.query(models.StudySetAssignment)
                .join(models.StudySetStudentAssignment)
                .filter(
                    and_(
                        models.StudySetAssignment.set_id == set_id,
                        models.StudySetStudentAssignment.user_id == current_user.user_id,
                    )
                )
                .first()
            )
            
            # Check class assignment
            from sqlalchemy import text
            enrolled_class_ids_result = db.execute(
                text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id"),
                {"user_id": current_user.user_id}
            )
            enrolled_class_ids = [row[0] for row in enrolled_class_ids_result]
            
            class_assignment = None
            if enrolled_class_ids:
                class_assignment = (
                    db.query(models.StudySetAssignment)
                    .filter(
                        and_(
                            models.StudySetAssignment.set_id == set_id,
                            models.StudySetAssignment.class_id.in_(enrolled_class_ids),
                        )
                    )
                    .first()
                )
            
            has_access = direct_assignment is not None or class_assignment is not None
            
    elif is_teacher:
        # Teachers can access:
        # 1. Their own sets
        # 2. Sets shared with them
        has_access = (
            study_set.creator_id == current_user.user_id
            or (study_set.is_shared and study_set.creator_id != current_user.user_id)
        )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied. You don't have permission to view this study set.")

    item_count = db.query(func.count(models.Question.question_id)).filter(
        models.Question.set_id == study_set.set_id
    ).scalar() or 0
    tags = [tag.tag for tag in study_set.tags]
    is_assigned = (
        db.query(models.StudySetAssignment)
        .filter(models.StudySetAssignment.set_id == set_id)
        .first()
        is not None
    )
    is_downloaded = (
        db.query(models.StudySetOffline)
        .filter(
            and_(
                models.StudySetOffline.set_id == set_id,
                models.StudySetOffline.user_id == current_user.user_id,
            )
        )
        .first()
        is not None
    )
    progress = (
        db.query(models.StudySetProgress)
        .filter(
            and_(
                models.StudySetProgress.set_id == set_id,
                models.StudySetProgress.user_id == current_user.user_id,
            )
        )
        .first()
    )
    mastery = float(progress.mastery_percentage) if progress else None

    return schemas.StudySetOut(
        id=study_set.set_id,
        title=study_set.title,
        subject=study_set.subject,
        type=study_set.type,
        level=study_set.level,
        description=study_set.description,
        creator_id=study_set.creator_id,
        created_at=study_set.created_at,
        updated_at=study_set.updated_at,
        item_count=item_count,
        tags=tags,
        is_assigned=is_assigned,
        is_downloaded=is_downloaded,
        mastery=mastery,
    )


@router.get("/classes", response_model=List[schemas.ClassOut])
def get_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get classes for the current user (teacher's classes or enrolled classes)"""
    # This is a simplified version - you'll need to check the actual class model structure
    # For now, returning empty list - you'll need to implement based on your class model
    return []


@router.post("/study-sets/{set_id}/offline")
def mark_offline(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a study set as downloaded/offline"""
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")

    # Check if already marked
    existing = (
        db.query(models.StudySetOffline)
        .filter(
            and_(
                models.StudySetOffline.set_id == set_id,
                models.StudySetOffline.user_id == current_user.user_id,
            )
        )
        .first()
    )

    if not existing:
        offline = models.StudySetOffline(
            user_id=current_user.user_id,
            set_id=set_id,
        )
        db.add(offline)
        db.commit()

    return {"message": "Study set marked as offline"}


@router.delete("/study-sets/{set_id}/offline")
def remove_offline(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a study set from offline downloads"""
    offline = (
        db.query(models.StudySetOffline)
        .filter(
            and_(
                models.StudySetOffline.set_id == set_id,
                models.StudySetOffline.user_id == current_user.user_id,
            )
        )
        .first()
    )

    if offline:
        db.delete(offline)
        db.commit()

    return {"message": "Study set removed from offline"}

