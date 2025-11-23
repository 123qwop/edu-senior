from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, text, select
from datetime import datetime, timedelta
from decimal import Decimal

from app.auth.deps import get_current_user
from app.auth.models import User
from app.database.database import get_db
from app.study_sets import models, schemas
from app.study_sets.recommendation_service import get_next_recommended_study_set

router = APIRouter()


@router.get("", response_model=List[schemas.StudySetOut])
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
        # Get sets assigned to user (both directly and via class enrollment)
        # Get classes the student is enrolled in
        enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
        enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
        enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
        
        # Build conditions for assigned sets
        assigned_conditions = []
        
        # Directly assigned sets (via StudySetStudentAssignment)
        assigned_conditions.append(
            models.StudySet.set_id.in_(
                db.query(models.StudySetAssignment.set_id)
                .join(models.StudySetStudentAssignment)
                .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)
            )
        )
        
        # Class-assigned sets (if student is enrolled in any classes)
        if enrolled_class_ids:
            assigned_conditions.append(
                models.StudySet.set_id.in_(
                    db.query(models.StudySetAssignment.set_id)
                    .filter(models.StudySetAssignment.class_id.in_(enrolled_class_ids))
                )
            )
        
        if assigned_conditions:
            query = query.filter(or_(*assigned_conditions))
        else:
            # No assignments found, return empty result
            query = query.filter(models.StudySet.set_id == -1)

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

        # Check if assigned (to current user specifically)
        is_assigned = False
        if is_student:
            # Check if directly assigned to student
            directly_assigned = (
                db.query(models.StudySetAssignment)
                .join(models.StudySetStudentAssignment)
                .filter(
                    and_(
                        models.StudySetAssignment.set_id == study_set.set_id,
                        models.StudySetStudentAssignment.user_id == current_user.user_id,
                    )
                )
                .first()
                is not None
            )
            
            # Check if assigned to a class the student is enrolled in
            enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
            enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
            enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
            
            class_assigned = False
            if enrolled_class_ids:
                class_assigned = (
                    db.query(models.StudySetAssignment)
                    .filter(
                        and_(
                            models.StudySetAssignment.set_id == study_set.set_id,
                            models.StudySetAssignment.class_id.in_(enrolled_class_ids),
                        )
                    )
                    .first()
                    is not None
                )
            
            is_assigned = directly_assigned or class_assigned
        else:
            # For teachers, just check if there's any assignment
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


@router.post("", response_model=schemas.StudySetOut, status_code=status.HTTP_201_CREATED)
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


@router.get("/classes")
def get_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get classes for the current user (teacher's classes or enrolled classes)"""
    try:
        is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
        result = []
        
        if is_teacher:
            # Teachers see their own classes with additional stats
            classes_query = text("""
                SELECT 
                    c.class_id, 
                    c.class_name, 
                    c.teacher_id,
                    c.subject,
                    c.level,
                    c.description,
                    COUNT(DISTINCT e.user_id) as student_count,
                    COUNT(DISTINCT ssa.assignment_id) as assignment_count
                FROM public.class c
                INNER JOIN public.teacher t ON c.teacher_id = t.teacher_id
                LEFT JOIN public.enrollment e ON c.class_id = e.class_id
                LEFT JOIN public.study_set_assignment ssa ON c.class_id = ssa.class_id
                WHERE t.teacher_id = :user_id
                GROUP BY c.class_id, c.class_name, c.teacher_id, c.subject, c.level, c.description
            """)
            classes_result = db.execute(classes_query, {"user_id": current_user.user_id})
            classes_data = classes_result.fetchall()
            
            # Convert directly to response format
            for row in classes_data:
                result.append({
                    "id": int(row[0]),
                    "class_name": str(row[1]),
                    "teacher_id": int(row[2]),
                    "subject": str(row[3]) if row[3] else None,
                    "level": str(row[4]) if row[4] else None,
                    "description": str(row[5]) if row[5] else None,
                    "student_count": int(row[6]) if row[6] else 0,
                    "assignment_count": int(row[7]) if row[7] else 0,
                    "average_mastery": None,  # TODO: Calculate from progress
                })
        else:
            # Students see classes they're enrolled in
            enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
            enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
            enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
            
            if enrolled_class_ids:
                # Query classes with subject and level using IN clause
                # Build placeholders for IN clause
                placeholders = ','.join([f':id_{i}' for i in range(len(enrolled_class_ids))])
                params = {f'id_{i}': class_id for i, class_id in enumerate(enrolled_class_ids)}
                classes_query = text(f"""
                    SELECT class_id, class_name, teacher_id, subject, level, description
                    FROM public.class 
                    WHERE class_id IN ({placeholders})
                """)
                classes_result = db.execute(classes_query, params)
                classes_data = classes_result.fetchall()
                
                for row in classes_data:
                    result.append({
                        "id": int(row[0]),
                        "class_name": str(row[1]),
                        "teacher_id": int(row[2]),
                        "subject": str(row[3]) if row[3] else None,
                        "level": str(row[4]) if row[4] else None,
                        "description": str(row[5]) if row[5] else None,
                        "student_count": 0,
                        "assignment_count": 0,
                        "average_mastery": None,
                    })
        
        return result
    except Exception as e:
        # Log the error for debugging
        import traceback
        error_msg = f"Error in get_classes: {str(e)}"
        print("=" * 50)
        print("ERROR in get_classes endpoint:")
        print(f"User ID: {current_user.user_id if current_user else 'None'}")
        print(f"User Role: {current_user.role.name if current_user and current_user.role else 'None'}")
        print(error_msg)
        traceback.print_exc()
        print("=" * 50)
        # Return empty list instead of raising error
        return []


@router.post("/classes", status_code=status.HTTP_201_CREATED)
def create_class(
    payload: schemas.ClassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new class (teachers only)"""
    # Check if user is a teacher
    if not current_user.role or current_user.role.name.lower() != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create classes")
    
    # Get or create teacher_id from teacher table
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    
    if not teacher_row:
        # Create teacher record if it doesn't exist
        create_teacher_query = text("""
            INSERT INTO public.teacher (teacher_id)
            VALUES (:user_id)
            RETURNING teacher_id
        """)
        try:
            teacher_result = db.execute(create_teacher_query, {"user_id": current_user.user_id})
            db.commit()
            teacher_row = teacher_result.first()
            teacher_id = teacher_row[0]
        except Exception as e:
            db.rollback()
            # If insert fails, try to get it again (might have been created by another request)
            teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
            teacher_row = teacher_result.first()
            if not teacher_row:
                raise HTTPException(status_code=500, detail=f"Failed to create teacher record: {str(e)}")
            teacher_id = teacher_row[0]
    else:
        teacher_id = teacher_row[0]
    
    # Create class with subject, level, and description
    class_query = text("""
        INSERT INTO public.class (class_name, teacher_id, subject, level, description)
        VALUES (:class_name, :teacher_id, :subject, :level, :description)
        RETURNING class_id, class_name, teacher_id, subject, level, description
    """)
    class_result = db.execute(
        class_query,
        {
            "class_name": payload.class_name,
            "teacher_id": teacher_id,
            "subject": payload.subject,
            "level": payload.level,
            "description": payload.description,
        }
    )
    db.commit()
    
    new_class = class_result.first()
    
    return {
        "id": int(new_class[0]),
        "class_name": str(new_class[1]),
        "teacher_id": int(new_class[2]),
        "subject": str(new_class[3]) if new_class[3] else None,
        "level": str(new_class[4]) if new_class[4] else None,
        "student_count": 0,
        "assignment_count": 0,
        "average_mastery": None,
    }


@router.get("/classes/{class_id}/students")
def get_class_students(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get students enrolled in a class"""
    # Verify user is a teacher and owns the class
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view class students")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to view this class")
    
    # Get enrolled students
    students_query = text("""
        SELECT u.user_id, u.name, u.email
        FROM public."User" u
        INNER JOIN public.enrollment e ON u.user_id = e.user_id
        WHERE e.class_id = :class_id
        ORDER BY u.name
    """)
    students_result = db.execute(students_query, {"class_id": class_id})
    students_data = students_result.fetchall()
    
    result = []
    for row in students_data:
        result.append({
            "id": int(row[0]),
            "name": str(row[1]),
            "email": str(row[2]),
        })
    
    return result


@router.get("/users/search")
def search_users(
    query: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users by name or email (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can search users")
    
    # Search users (excluding current user and only students)
    search_query = text("""
        SELECT u.user_id, u.name, u.email
        FROM public."User" u
        INNER JOIN public.role r ON u.role_id = r.role_id
        WHERE (LOWER(u.name) LIKE LOWER(:query) OR LOWER(u.email) LIKE LOWER(:query))
        AND r.role_name = 'student'
        AND u.user_id != :current_user_id
        ORDER BY u.name
        LIMIT 20
    """)
    search_result = db.execute(
        search_query,
        {
            "query": f"%{query}%",
            "current_user_id": current_user.user_id,
        }
    )
    users_data = search_result.fetchall()
    
    result = []
    for row in users_data:
        result.append({
            "id": int(row[0]),
            "name": str(row[1]),
            "email": str(row[2]),
        })
    
    return result


@router.post("/classes/{class_id}/students")
def add_students_to_class(
    class_id: int,
    payload: schemas.AddStudentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add students to a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can add students to classes")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to modify this class")
    
    # Add students to class
    added = []
    errors = []
    
    for student_id in payload.student_ids:
        try:
            # Check if already enrolled
            check_query = text("""
                SELECT enrollment_id FROM public.enrollment 
                WHERE user_id = :user_id AND class_id = :class_id
            """)
            check_result = db.execute(check_query, {"user_id": student_id, "class_id": class_id})
            if check_result.first():
                errors.append(f"Student {student_id} is already enrolled")
                continue
            
            # Insert enrollment
            insert_query = text("""
                INSERT INTO public.enrollment (user_id, class_id)
                VALUES (:user_id, :class_id)
                RETURNING enrollment_id
            """)
            insert_result = db.execute(insert_query, {"user_id": student_id, "class_id": class_id})
            db.commit()
            added.append(student_id)
        except Exception as e:
            db.rollback()
            errors.append(f"Failed to add student {student_id}: {str(e)}")
    
    return {
        "added": added,
        "errors": errors,
        "message": f"Added {len(added)} student(s)" + (f", {len(errors)} error(s)" if errors else ""),
    }


@router.delete("/classes/{class_id}/students/{student_id}")
def remove_student_from_class(
    class_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a student from a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can remove students from classes")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to modify this class")
    
    # Check if student is enrolled
    enrollment_query = text("""
        SELECT enrollment_id FROM public.enrollment 
        WHERE user_id = :user_id AND class_id = :class_id
    """)
    enrollment_result = db.execute(enrollment_query, {"user_id": student_id, "class_id": class_id})
    enrollment_row = enrollment_result.first()
    
    if not enrollment_row:
        raise HTTPException(status_code=404, detail="Student is not enrolled in this class")
    
    # Remove enrollment
    delete_query = text("""
        DELETE FROM public.enrollment 
        WHERE user_id = :user_id AND class_id = :class_id
    """)
    db.execute(delete_query, {"user_id": student_id, "class_id": class_id})
    db.commit()
    
    return {"message": "Student removed from class successfully"}


@router.delete("/classes/{class_id}")
def delete_class(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a class (teachers only, must own the class)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can delete classes")
    
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to delete this class")
    
    delete_query = text("DELETE FROM public.class WHERE class_id = :class_id")
    db.execute(delete_query, {"class_id": class_id})
    db.commit()
    
    return {"message": "Class deleted successfully"}


@router.put("/classes/{class_id}")
def update_class(
    class_id: int,
    payload: schemas.ClassUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can update classes")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to modify this class")
    
    # Build update query dynamically based on provided fields
    updates = []
    params = {"class_id": class_id}
    
    if payload.class_name is not None:
        updates.append("class_name = :class_name")
        params["class_name"] = payload.class_name
    
    if payload.subject is not None:
        updates.append("subject = :subject")
        params["subject"] = payload.subject
    
    if payload.level is not None:
        updates.append("level = :level")
        params["level"] = payload.level
    
    if payload.description is not None:
        updates.append("description = :description")
        params["description"] = payload.description
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Execute update
    update_query = text(f"""
        UPDATE public.class 
        SET {', '.join(updates)}
        WHERE class_id = :class_id
        RETURNING class_id, class_name, teacher_id, subject, level, description
    """)
    update_result = db.execute(update_query, params)
    db.commit()
    
    updated_class = update_result.first()
    
    if not updated_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get student and assignment counts
    stats_query = text("""
        SELECT 
            COUNT(DISTINCT e.user_id) as student_count,
            COUNT(DISTINCT ssa.assignment_id) as assignment_count
        FROM public.class c
        LEFT JOIN public.enrollment e ON c.class_id = e.class_id
        LEFT JOIN public.study_set_assignment ssa ON c.class_id = ssa.class_id
        WHERE c.class_id = :class_id
        GROUP BY c.class_id
    """)
    stats_result = db.execute(stats_query, {"class_id": class_id})
    stats_row = stats_result.first()
    
    return {
        "id": int(updated_class[0]),
        "class_name": str(updated_class[1]),
        "teacher_id": int(updated_class[2]),
        "subject": str(updated_class[3]) if updated_class[3] else None,
        "level": str(updated_class[4]) if updated_class[4] else None,
        "description": str(updated_class[5]) if updated_class[5] else None,
        "student_count": int(stats_row[0]) if stats_row and stats_row[0] else 0,
        "assignment_count": int(stats_row[1]) if stats_row and stats_row[1] else 0,
        "average_mastery": None,
    }


@router.post("/classes/{class_id}/assignments")
def create_class_assignment(
    class_id: int,
    payload: schemas.CreateAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a study set to a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to modify this class")
    
    # Verify study set exists and teacher has access
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == payload.set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    # Check if teacher owns the study set or it's shared
    if study_set.creator_id != current_user.user_id and not study_set.is_shared:
        raise HTTPException(status_code=403, detail="You don't have permission to assign this study set")
    
    # Check if assignment already exists
    existing_query = text("""
        SELECT assignment_id FROM public.study_set_assignment 
        WHERE set_id = :set_id AND class_id = :class_id
    """)
    existing_result = db.execute(existing_query, {"set_id": payload.set_id, "class_id": class_id})
    if existing_result.first():
        raise HTTPException(status_code=400, detail="This study set is already assigned to this class")
    
    # Create assignment
    assignment_query = text("""
        INSERT INTO public.study_set_assignment (set_id, class_id, assigned_by, due_date)
        VALUES (:set_id, :class_id, :assigned_by, :due_date)
        RETURNING assignment_id
    """)
    assignment_result = db.execute(
        assignment_query,
        {
            "set_id": payload.set_id,
            "class_id": class_id,
            "assigned_by": current_user.user_id,
            "due_date": payload.due_date,
        }
    )
    db.commit()
    
    return {"message": "Study set assigned to class successfully", "assignment_id": assignment_result.first()[0]}


@router.get("/classes/{class_id}/assignments")
def get_class_assignments(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all assignments for a class"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view class assignments")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to view this class")
    
    # Get assignments with study set details
    assignments_query = text("""
        SELECT 
            ssa.assignment_id,
            ssa.set_id,
            ssa.due_date,
            ssa.assigned_by,
            ss.title,
            ss.subject,
            ss.type,
            ss.level,
            ss.description
        FROM public.study_set_assignment ssa
        INNER JOIN public.studyset ss ON ssa.set_id = ss.set_id
        WHERE ssa.class_id = :class_id
        ORDER BY ssa.assignment_id DESC
    """)
    assignments_result = db.execute(assignments_query, {"class_id": class_id})
    assignments_data = assignments_result.fetchall()
    
    result = []
    for row in assignments_data:
        result.append({
            "assignment_id": int(row[0]),
            "set_id": int(row[1]),
            "due_date": row[2].isoformat() if row[2] else None,
            "assigned_by": int(row[3]),
            "title": str(row[4]),
            "subject": str(row[5]) if row[5] else None,
            "type": str(row[6]),
            "level": str(row[7]) if row[7] else None,
            "description": str(row[8]) if row[8] else None,
        })
    
    return result


@router.get("/classes/{class_id}/students/progress")
def get_class_students_progress(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student progress for a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view student progress")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to view this class")
    
    # Get all students in the class
    students_query = text("""
        SELECT u.user_id, u.name, u.email
        FROM public."User" u
        INNER JOIN public.enrollment e ON u.user_id = e.user_id
        WHERE e.class_id = :class_id
        ORDER BY u.name
    """)
    students_result = db.execute(students_query, {"class_id": class_id})
    students_data = students_result.fetchall()
    
    # Get all assignments for this class
    assignments_query = text("""
        SELECT ssa.assignment_id, ssa.set_id, ss.title
        FROM public.study_set_assignment ssa
        INNER JOIN public.studyset ss ON ssa.set_id = ss.set_id
        WHERE ssa.class_id = :class_id
    """)
    assignments_result = db.execute(assignments_query, {"class_id": class_id})
    assignments_data = assignments_result.fetchall()
    
    assignment_ids = [row[0] for row in assignments_data]
    set_ids = [row[1] for row in assignments_data]
    
    result = []
    
    for student_row in students_data:
        student_id = int(student_row[0])
        student_name = str(student_row[1])
        student_email = str(student_row[2])
        
        # Get progress for this student across all assignments
        if set_ids:
            progress_query = text("""
                SELECT 
                    ssp.set_id,
                    ssp.mastery_percentage,
                    ssp.items_completed,
                    ssp.total_items,
                    ssp.last_activity
                FROM public.study_set_progress ssp
                WHERE ssp.user_id = :student_id
                AND ssp.set_id = ANY(:set_ids)
            """)
            progress_result = db.execute(
                progress_query,
                {"student_id": student_id, "set_ids": set_ids}
            )
            progress_data = progress_result.fetchall()
        else:
            progress_data = []
        
        # Create a map of set_id -> progress
        progress_map = {}
        for p_row in progress_data:
            set_id = int(p_row[0])
            mastery = float(p_row[1]) if p_row[1] else 0.0
            items_completed = int(p_row[2]) if p_row[2] else 0
            total_items = int(p_row[3]) if p_row[3] else 0
            last_activity = p_row[4].isoformat() if p_row[4] else None
            progress_map[set_id] = {
                "mastery": mastery,
                "items_completed": items_completed,
                "total_items": total_items,
                "last_activity": last_activity,
            }
        
        # Build assignment details
        assignment_details = []
        total_mastery_sum = 0.0
        completed_count = 0
        
        for assign_row in assignments_data:
            assignment_id = int(assign_row[0])
            set_id = int(assign_row[1])
            title = str(assign_row[2])
            
            if set_id in progress_map:
                progress_info = progress_map[set_id]
                is_completed = progress_info["items_completed"] == progress_info["total_items"] and progress_info["total_items"] > 0
                if is_completed:
                    completed_count += 1
                if progress_info["mastery"] > 0:
                    total_mastery_sum += progress_info["mastery"]
                
                assignment_details.append({
                    "assignment_id": assignment_id,
                    "set_id": set_id,
                    "title": title,
                    "mastery": float(round(progress_info["mastery"], 2)),
                    "items_completed": progress_info["items_completed"],
                    "total_items": progress_info["total_items"],
                    "is_completed": is_completed,
                    "last_activity": progress_info["last_activity"],
                })
            else:
                assignment_details.append({
                    "assignment_id": assignment_id,
                    "set_id": set_id,
                    "title": title,
                    "mastery": 0.0,
                    "items_completed": 0,
                    "total_items": 0,
                    "is_completed": False,
                    "last_activity": None,
                })
        
        # Calculate average mastery (only for completed assignments with progress)
        mastery_values = [a["mastery"] for a in assignment_details if a["mastery"] > 0]
        average_mastery = float(round(sum(mastery_values) / len(mastery_values), 2)) if mastery_values else 0.0
        
        result.append({
            "student_id": student_id,
            "student_name": student_name,
            "student_email": student_email,
            "assignments_completed": completed_count,
            "assignments_total": len(assignments_data),
            "average_mastery": average_mastery,
            "assignments": assignment_details,
        })
    
    return result


@router.get("/classes/{class_id}/students/progress")
def get_class_students_progress(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student progress for a class (teachers only)"""
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view student progress")
    
    # Verify class ownership
    teacher_query = text("SELECT teacher_id FROM public.teacher WHERE teacher_id = :user_id")
    teacher_result = db.execute(teacher_query, {"user_id": current_user.user_id})
    teacher_row = teacher_result.first()
    if not teacher_row:
        raise HTTPException(status_code=404, detail="Teacher record not found")
    
    teacher_id = teacher_row[0]
    
    # Check if class belongs to teacher
    class_query = text("SELECT class_id FROM public.class WHERE class_id = :class_id AND teacher_id = :teacher_id")
    class_result = db.execute(class_query, {"class_id": class_id, "teacher_id": teacher_id})
    if not class_result.first():
        raise HTTPException(status_code=403, detail="You don't have permission to view this class")
    
    # Get all students in the class
    students_query = text("""
        SELECT u.user_id, u.name, u.email
        FROM public."User" u
        INNER JOIN public.enrollment e ON u.user_id = e.user_id
        WHERE e.class_id = :class_id
        ORDER BY u.name
    """)
    students_result = db.execute(students_query, {"class_id": class_id})
    students_data = students_result.fetchall()
    
    # Get all assignments for this class
    assignments_query = text("""
        SELECT ssa.assignment_id, ssa.set_id, ss.title
        FROM public.study_set_assignment ssa
        INNER JOIN public.studyset ss ON ssa.set_id = ss.set_id
        WHERE ssa.class_id = :class_id
    """)
    assignments_result = db.execute(assignments_query, {"class_id": class_id})
    assignments_data = assignments_result.fetchall()
    
    assignment_ids = [row[0] for row in assignments_data]
    set_ids = [row[1] for row in assignments_data]
    
    result = []
    
    for student_row in students_data:
        student_id = int(student_row[0])
        student_name = str(student_row[1])
        student_email = str(student_row[2])
        
        # Get progress for this student across all assignments
        if set_ids:
            progress_query = text("""
                SELECT 
                    ssp.set_id,
                    ssp.mastery_percentage,
                    ssp.items_completed,
                    ssp.total_items,
                    ssp.last_activity
                FROM public.study_set_progress ssp
                WHERE ssp.user_id = :student_id
                AND ssp.set_id = ANY(:set_ids)
            """)
            progress_result = db.execute(
                progress_query,
                {"student_id": student_id, "set_ids": set_ids}
            )
            progress_data = progress_result.fetchall()
        else:
            progress_data = []
        
        # Create a map of set_id -> progress
        progress_map = {}
        for p_row in progress_data:
            set_id = int(p_row[0])
            mastery = float(p_row[1]) if p_row[1] else 0.0
            items_completed = int(p_row[2]) if p_row[2] else 0
            total_items = int(p_row[3]) if p_row[3] else 0
            last_activity = p_row[4].isoformat() if p_row[4] else None
            progress_map[set_id] = {
                "mastery": mastery,
                "items_completed": items_completed,
                "total_items": total_items,
                "last_activity": last_activity,
            }
        
        # Build assignment details
        assignment_details = []
        total_mastery_sum = 0.0
        completed_count = 0
        
        for assign_row in assignments_data:
            assignment_id = int(assign_row[0])
            set_id = int(assign_row[1])
            title = str(assign_row[2])
            
            if set_id in progress_map:
                progress_info = progress_map[set_id]
                is_completed = progress_info["items_completed"] == progress_info["total_items"] and progress_info["total_items"] > 0
                if is_completed:
                    completed_count += 1
                if progress_info["mastery"] > 0:
                    total_mastery_sum += progress_info["mastery"]
                
                assignment_details.append({
                    "assignment_id": assignment_id,
                    "set_id": set_id,
                    "title": title,
                    "mastery": float(round(progress_info["mastery"], 2)),
                    "items_completed": progress_info["items_completed"],
                    "total_items": progress_info["total_items"],
                    "is_completed": is_completed,
                    "last_activity": progress_info["last_activity"],
                })
            else:
                assignment_details.append({
                    "assignment_id": assignment_id,
                    "set_id": set_id,
                    "title": title,
                    "mastery": 0.0,
                    "items_completed": 0,
                    "total_items": 0,
                    "is_completed": False,
                    "last_activity": None,
                })
        
        # Calculate average mastery (only for completed assignments with progress)
        mastery_values = [a["mastery"] for a in assignment_details if a["mastery"] > 0]
        average_mastery = float(round(sum(mastery_values) / len(mastery_values), 2)) if mastery_values else 0.0
        
        result.append({
            "student_id": student_id,
            "student_name": student_name,
            "student_email": student_email,
            "assignments_completed": completed_count,
            "assignments_total": len(assignments_data),
            "average_mastery": average_mastery,
            "assignments": assignment_details,
        })
    
    return result


@router.get("/analytics")
def get_analytics(
    set_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    if not is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view analytics")
    
    if set_id:
        study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
        if not study_set or study_set.creator_id != current_user.user_id:
            raise HTTPException(status_code=404, detail="Study set not found")
        
        study_sets = [study_set]
    else:
        study_sets = db.query(models.StudySet).filter(models.StudySet.creator_id == current_user.user_id).all()
    
    analytics_list = []
    total_students_set = set()
    total_mastery_sum = 0.0
    total_mastery_count = 0
    
    for study_set in study_sets:
        assignment_query = text("""
            SELECT DISTINCT e.user_id
            FROM public.study_set_assignment ssa
            JOIN public.enrollment e ON ssa.class_id = e.class_id
            WHERE ssa.set_id = :set_id
        """)
        assigned_students = db.execute(assignment_query, {"set_id": study_set.set_id}).fetchall()
        student_ids = [row[0] for row in assigned_students]
        
        if student_ids:
            total_students_set.update(student_ids)
        
        if student_ids:
            progress_list = (
                db.query(models.StudySetProgress)
                .filter(
                    and_(
                        models.StudySetProgress.set_id == study_set.set_id,
                        models.StudySetProgress.user_id.in_(student_ids)
                    )
                )
                .all()
            )
        else:
            progress_list = []
        
        # Get student details with progress
        student_details = []
        if student_ids:
            if len(student_ids) > 0:
                placeholders = ", ".join([f":student_id_{i}" for i in range(len(student_ids))])
                students_query = text(f"""
                    SELECT u.user_id, u.name, u.email
                    FROM public."User" u
                    WHERE u.user_id IN ({placeholders})
                    ORDER BY u.name
                """)
                params = {f"student_id_{i}": sid for i, sid in enumerate(student_ids)}
                students_result = db.execute(students_query, params)
                students_data = students_result.fetchall()
            else:
                students_data = []
            
            # Create a map of user_id -> progress
            progress_map = {}
            for p in progress_list:
                progress_map[p.user_id] = {
                    "mastery": float(p.mastery_percentage) if p.mastery_percentage else 0.0,
                    "items_completed": p.items_completed if p.items_completed else 0,
                    "total_items": p.total_items if p.total_items else 0,
                    "last_activity": p.last_activity.isoformat() if p.last_activity else None,
                }
            
            for student_row in students_data:
                student_id = int(student_row[0])
                student_name = str(student_row[1])
                student_email = str(student_row[2])
                
                if student_id in progress_map:
                    progress_info = progress_map[student_id]
                    is_completed = progress_info["items_completed"] == progress_info["total_items"] and progress_info["total_items"] > 0
                    student_details.append({
                        "student_id": student_id,
                        "student_name": student_name,
                        "student_email": student_email,
                        "mastery": float(round(progress_info["mastery"], 2)),
                        "items_completed": progress_info["items_completed"],
                        "total_items": progress_info["total_items"],
                        "is_completed": is_completed,
                        "last_activity": progress_info["last_activity"],
                    })
                else:
                    student_details.append({
                        "student_id": student_id,
                        "student_name": student_name,
                        "student_email": student_email,
                        "mastery": 0.0,
                        "items_completed": 0,
                        "total_items": 0,
                        "is_completed": False,
                        "last_activity": None,
                    })
        
        total_attempts = len(progress_list)
        if progress_list:
            avg_mastery = float(sum(float(p.mastery_percentage) for p in progress_list) / len(progress_list))
            completion_count = sum(1 for p in progress_list if p.items_completed == p.total_items)
            completion_rate = float((completion_count / len(student_ids) * 100) if student_ids else 0)
        else:
            avg_mastery = 0.0
            completion_rate = 0.0
        
        if avg_mastery > 0:
            total_mastery_sum += avg_mastery
            total_mastery_count += 1
        
        analytics_list.append({
            "set_id": study_set.set_id,
            "title": study_set.title,
            "total_students": len(student_ids),
            "average_mastery": float(round(avg_mastery, 2)),
            "completion_rate": float(round(completion_rate, 2)),
            "total_attempts": total_attempts,
            "students": student_details,
        })
    
    average_mastery = float((total_mastery_sum / total_mastery_count) if total_mastery_count > 0 else 0.0)
    
    return {
        "study_sets": analytics_list,
        "total_students": len(total_students_set),
        "average_mastery": float(round(average_mastery, 2)),
        "total_assignments": len(study_sets),
    }


@router.get("/progress")
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    if not is_student:
        raise HTTPException(status_code=403, detail="Only students can view progress")
    
    progress_records = (
        db.query(models.StudySetProgress)
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .all()
    )
    
    progress_list = []
    total_mastery_sum = 0.0
    total_items_completed = 0
    total_items = 0
    
    for progress in progress_records:
        study_set = db.query(models.StudySet).filter(models.StudySet.set_id == progress.set_id).first()
        if not study_set:
            continue
        
        mastery = float(progress.mastery_percentage)
        total_mastery_sum += mastery
        total_items_completed += progress.items_completed
        total_items += progress.total_items
        
        last_activity_str = None
        if progress.last_activity:
            last_activity_str = progress.last_activity.isoformat()
        
        attempts_query = text("""
            SELECT COUNT(*) 
            FROM public.study_set_progress 
            WHERE set_id = :set_id AND user_id = :user_id
        """)
        attempts_result = db.execute(attempts_query, {"set_id": progress.set_id, "user_id": current_user.user_id})
        attempts = attempts_result.scalar() or 0
        
        progress_list.append({
            "set_id": study_set.set_id,
            "title": study_set.title,
            "subject": study_set.subject,
            "mastery_percentage": float(round(mastery, 2)),
            "items_completed": progress.items_completed,
            "total_items": progress.total_items,
            "last_activity": last_activity_str,
            "attempts": attempts,
        })
    
    total_mastery = float((total_mastery_sum / len(progress_list)) if progress_list else 0.0)
    
    return {
        "study_sets": progress_list,
        "total_mastery": float(round(total_mastery, 2)),
        "total_items_completed": total_items_completed,
        "total_items": total_items,
    }


@router.post("/attempts/batch")
def batch_record_progress(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Batch record progress for offline attempts"""
    is_student = current_user.role and current_user.role.name.lower() == "student"
    if not is_student:
        raise HTTPException(status_code=403, detail="Only students can record progress")
    
    attempts = payload.get("attempts", [])
    if not attempts:
        return {"synced": 0, "failed": 0}
    
    synced_count = 0
    failed_count = 0
    
    for attempt_data in attempts:
        try:
            set_id = attempt_data.get("set_id")
            question_id = attempt_data.get("question_id")
            is_correct = attempt_data.get("is_correct", False)
            answer = attempt_data.get("answer", "")
            timestamp_str = attempt_data.get("timestamp")
            
            if not set_id or not question_id:
                failed_count += 1
                continue
            
            # Get or create progress record
            progress = (
                db.query(models.StudySetProgress)
                .filter(
                    and_(
                        models.StudySetProgress.set_id == set_id,
                        models.StudySetProgress.user_id == current_user.user_id
                    )
                )
                .first()
            )
            
            if not progress:
                # Get study set to get total items
                study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
                if not study_set:
                    failed_count += 1
                    continue
                
                # Count total questions
                total_items = db.query(models.Question).filter(models.Question.set_id == set_id).count()
                
                progress = models.StudySetProgress(
                    set_id=set_id,
                    user_id=current_user.user_id,
                    items_completed=0,
                    total_items=total_items,
                    mastery_percentage=0.0,
                )
                db.add(progress)
            
            # Update progress
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    if not progress.last_activity or timestamp > progress.last_activity:
                        progress.last_activity = timestamp
                except:
                    progress.last_activity = datetime.utcnow()
            else:
                progress.last_activity = datetime.utcnow()
            
            # Update mastery based on correctness
            # This is a simplified calculation - you might want to refine this
            if is_correct:
                progress.items_completed = min(progress.items_completed + 1, progress.total_items)
            
            # Recalculate mastery percentage
            if progress.total_items > 0:
                progress.mastery_percentage = float((progress.items_completed / progress.total_items) * 100)
            
            db.commit()
            synced_count += 1
            
        except Exception as e:
            db.rollback()
            failed_count += 1
            print(f"Failed to sync attempt: {e}")
    
    return {"synced": synced_count, "failed": failed_count}


@router.get("/{set_id}", response_model=schemas.StudySetOut)
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


@router.put("/{set_id}", response_model=schemas.StudySetOut)
def update_study_set(
    set_id: int,
    payload: schemas.StudySetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a study set (only creator can update)"""
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    # Only creator can update
    if study_set.creator_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You don't have permission to update this study set")
    
    # Update fields
    if payload.title is not None:
        study_set.title = payload.title
    if payload.subject is not None:
        study_set.subject = payload.subject
    if payload.type is not None:
        study_set.type = payload.type
    if payload.level is not None:
        study_set.level = payload.level
    if payload.description is not None:
        study_set.description = payload.description
    if payload.is_shared is not None:
        # Only teachers can set is_shared
        is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
        if is_teacher:
            study_set.is_shared = payload.is_shared
    if payload.is_public is not None:
        study_set.is_public = payload.is_public
    
    study_set.updated_at = datetime.utcnow()
    
    # Update tags if provided
    if payload.tags is not None:
        # Delete existing tags
        db.query(models.StudySetTag).filter(models.StudySetTag.set_id == set_id).delete()
        # Add new tags
        for tag in payload.tags:
            study_set_tag = models.StudySetTag(set_id=set_id, tag=tag)
            db.add(study_set_tag)
    
    db.commit()
    db.refresh(study_set)
    
    # Get item count and tags
    item_count = db.query(models.Question).filter(models.Question.set_id == set_id).count()
    tags = [tag.tag for tag in db.query(models.StudySetTag).filter(models.StudySetTag.set_id == set_id).all()]
    
    # Check if assigned
    is_assigned = db.query(models.StudySetAssignment).filter(
        models.StudySetAssignment.set_id == set_id
    ).first() is not None or db.query(models.StudySetStudentAssignment).filter(
        models.StudySetStudentAssignment.assignment_id.in_(
            db.query(models.StudySetAssignment.assignment_id).filter(
                models.StudySetAssignment.set_id == set_id
            )
        )
    ).first() is not None
    
    # Check if downloaded
    is_downloaded = db.query(models.StudySetOffline).filter(
        models.StudySetOffline.set_id == set_id,
        models.StudySetOffline.user_id == current_user.user_id
    ).first() is not None
    
    # Get mastery if student
    mastery = None
    is_student = current_user.role and current_user.role.name.lower() == "student"
    if is_student:
        progress = db.query(models.StudySetProgress).filter(
            models.StudySetProgress.set_id == set_id,
            models.StudySetProgress.user_id == current_user.user_id
        ).first()
        if progress:
            mastery = float(progress.mastery_percentage)
    
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


@router.get("/classes")
def get_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get classes for the current user (teacher's classes or enrolled classes)"""
    try:
        is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
        result = []
        
        if is_teacher:
            # Teachers see their own classes
            # Note: class.teacher_id references teacher.teacher_id, and teacher.teacher_id = User.user_id
            # So we can query directly if teacher_id in class table equals user_id
            # But actually, we need to join through teacher table
            classes_query = text("""
                SELECT c.class_id, c.class_name, c.teacher_id 
                FROM public.class c
                INNER JOIN public.teacher t ON c.teacher_id = t.teacher_id
                WHERE t.teacher_id = :user_id
            """)
            classes_result = db.execute(classes_query, {"user_id": current_user.user_id})
            classes_data = classes_result.fetchall()
            
                # Convert directly to response format
            for row in classes_data:
                result.append({
                    "id": int(row[0]),
                    "class_name": str(row[1]),
                    "teacher_id": int(row[2]),
                    "subject": None,
                })
        else:
            # Students see classes they're enrolled in
            enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
            enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
            enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
            
            if enrolled_class_ids:
                # Query classes using ORM but convert to dicts immediately
                class_rows = db.query(models.Class).filter(
                    models.Class.class_id.in_(enrolled_class_ids)
                ).all()
                classes_data = [
                    (c.class_id, c.class_name, c.teacher_id) 
                    for c in class_rows
                ]
                
                for row in classes_data:
                    result.append({
                        "id": int(row[0]),
                        "class_name": str(row[1]),
                        "teacher_id": int(row[2]),
                        "subject": None,
                    })
        
        return result
    except Exception as e:
        # Log the error for debugging
        import traceback
        error_msg = f"Error in get_classes: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        # Return empty list - this should still validate as List[ClassOut]
        return []


@router.post("/{set_id}/offline")
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


@router.delete("/{set_id}/offline")
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


@router.get("/{set_id}/questions")
def get_study_set_questions(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    is_student = current_user.role and current_user.role.name.lower() == "student"
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    
    if is_student:
        if study_set.creator_id != current_user.user_id:
            # Check if directly assigned to student
            directly_assigned = (
                db.query(models.StudySetAssignment)
                .join(models.StudySetStudentAssignment)
                .filter(
                    and_(
                        models.StudySetAssignment.set_id == study_set.set_id,
                        models.StudySetStudentAssignment.user_id == current_user.user_id,
                    )
                )
                .first()
                is not None
            )
            
            # Check if assigned to a class the student is enrolled in
            enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
            enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
            enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
            
            class_assigned = False
            if enrolled_class_ids:
                class_assigned = (
                    db.query(models.StudySetAssignment)
                    .filter(
                        and_(
                            models.StudySetAssignment.set_id == study_set.set_id,
                            models.StudySetAssignment.class_id.in_(enrolled_class_ids),
                        )
                    )
                    .first()
                    is not None
                )
            
            if not (directly_assigned or class_assigned):
                raise HTTPException(status_code=403, detail="You don't have access to this study set")
    elif is_teacher:
        if study_set.creator_id != current_user.user_id and not study_set.is_shared:
            raise HTTPException(status_code=403, detail="You don't have access to this study set")
    
    questions = db.query(models.Question).filter(models.Question.set_id == set_id).all()
    
    result = []
    for question in questions:
        question_data = {
            "id": question.question_id,
            "set_id": question.set_id,
            "type": question.type,
            "content": question.content,
            "correct_answer": question.correct_answer,
        }
        
        if question.type == "flashcard":
            flashcard = db.query(models.Flashcard).filter(models.Flashcard.question_id == question.question_id).first()
            if flashcard:
                question_data["term"] = flashcard.term
                question_data["definition"] = flashcard.definition
        
        if question.type in ["multiple_choice", "true_false"]:
            options = db.query(models.QuestionOption).filter(
                models.QuestionOption.question_id == question.question_id
            ).order_by(models.QuestionOption.option_order).all()
            question_data["options"] = [opt.option_text for opt in options]
        
        result.append(question_data)
    
    return result


@router.post("/{set_id}/progress")
def record_progress(
    set_id: int,
    payload: schemas.RecordProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    if not is_student:
        raise HTTPException(status_code=403, detail="Only students can record progress")
    
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    questions = db.query(models.Question).filter(models.Question.set_id == set_id).all()
    total_questions = len(questions)
    correct_answers = 0
    
    for question in questions:
        user_answer = payload.answers.get(str(question.question_id))
        if user_answer is not None:
            is_correct = False
            if question.type == "multiple_choice":
                try:
                    user_answer_idx = int(user_answer)
                    options = db.query(models.QuestionOption).filter(
                        models.QuestionOption.question_id == question.question_id
                    ).order_by(models.QuestionOption.option_order).all()
                    if user_answer_idx >= 0 and user_answer_idx < len(options):
                        correct_option_text = question.correct_answer.strip()
                        selected_option_text = options[user_answer_idx].option_text.strip()
                        is_correct = selected_option_text.lower() == correct_option_text.lower()
                except (ValueError, IndexError):
                    is_correct = False
            elif question.type == "true_false":
                user_answer_bool = str(user_answer).lower() == "true"
                correct_answer_bool = str(question.correct_answer).strip().lower() == "true"
                is_correct = user_answer_bool == correct_answer_bool
            else:
                is_correct = str(user_answer).strip().lower() == str(question.correct_answer).strip().lower()
            
            if is_correct:
                correct_answers += 1
    
    mastery_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    
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
    
    if progress:
        progress.mastery_percentage = Decimal(str(mastery_percentage))
        progress.last_activity = datetime.utcnow()
        progress.items_completed = correct_answers
        progress.total_items = total_questions
    else:
        progress = models.StudySetProgress(
            user_id=current_user.user_id,
            set_id=set_id,
            mastery_percentage=Decimal(str(mastery_percentage)),
            last_activity=datetime.utcnow(),
            items_completed=correct_answers,
            total_items=total_questions,
        )
        db.add(progress)
    
    db.commit()
    
    return {
        "mastery_percentage": float(mastery_percentage),
        "correct_answers": correct_answers,
        "total_questions": total_questions,
    }


@router.delete("/{set_id}")
def delete_study_set(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    if study_set.creator_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own study sets")
    
    db.delete(study_set)
    db.commit()
    
    return {"message": "Study set deleted successfully"}


@router.post("/{set_id}/questions")
def add_question(
    set_id: int,
    payload: schemas.QuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    if study_set.creator_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only add questions to your own study sets")
    
    question_type = payload.type
    if study_set.type == "Flashcards" and question_type != "flashcard":
        raise HTTPException(status_code=400, detail="Flashcard study sets can only contain flashcard questions")
    if study_set.type == "Quiz" and question_type not in ["multiple_choice", "true_false", "short_answer"]:
        raise HTTPException(status_code=400, detail="Quiz study sets can only contain quiz questions")
    if study_set.type == "Problem set" and question_type != "problem":
        raise HTTPException(status_code=400, detail="Problem set study sets can only contain problem questions")
    
    question = models.Question(
        set_id=set_id,
        type=question_type,
        content=payload.content,
        correct_answer=payload.correct_answer,
    )
    db.add(question)
    db.flush()
    
    if question_type == "flashcard" and payload.term and payload.definition:
        flashcard = models.Flashcard(
            question_id=question.question_id,
            term=payload.term,
            definition=payload.definition,
        )
        db.add(flashcard)
    
    if question_type == "multiple_choice" and payload.options:
        for idx, option_text in enumerate(payload.options, 1):
            option = models.QuestionOption(
                question_id=question.question_id,
                option_text=option_text,
                option_order=idx,
            )
            db.add(option)
    
    db.commit()
    
    return {
        "id": question.question_id,
        "set_id": question.set_id,
        "type": question.type,
        "content": question.content,
        "correct_answer": question.correct_answer,
    }


@router.put("/{set_id}/questions/{question_id}")
def update_question(
    set_id: int,
    question_id: int,
    payload: schemas.QuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    if study_set.creator_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only update questions in your own study sets")
    
    question = db.query(models.Question).filter(
        and_(
            models.Question.question_id == question_id,
            models.Question.set_id == set_id,
        )
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question.type = payload.type
    question.content = payload.content
    question.correct_answer = payload.correct_answer
    
    if question.type == "flashcard":
        flashcard = db.query(models.Flashcard).filter(models.Flashcard.question_id == question_id).first()
        if flashcard:
            flashcard.term = payload.term or ""
            flashcard.definition = payload.definition or ""
        elif payload.term and payload.definition:
            flashcard = models.Flashcard(
                question_id=question.question_id,
                term=payload.term,
                definition=payload.definition,
            )
            db.add(flashcard)
    
    if question.type == "multiple_choice":
        db.query(models.QuestionOption).filter(models.QuestionOption.question_id == question_id).delete()
        if payload.options:
            for idx, option_text in enumerate(payload.options, 1):
                option = models.QuestionOption(
                    question_id=question.question_id,
                    option_text=option_text,
                    option_order=idx,
                )
                db.add(option)
    
    db.commit()
    
    return {
        "id": question.question_id,
        "set_id": question.set_id,
        "type": question.type,
        "content": question.content,
        "correct_answer": question.correct_answer,
    }


@router.delete("/{set_id}/questions/{question_id}")
def delete_question(
    set_id: int,
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    study_set = db.query(models.StudySet).filter(models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    
    if study_set.creator_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only delete questions from your own study sets")
    
    question = db.query(models.Question).filter(
        and_(
            models.Question.question_id == question_id,
            models.Question.set_id == set_id,
        )
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    
    return {"message": "Question deleted successfully"}


@router.get("/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    is_teacher = current_user.role and current_user.role.name.lower() == "teacher"
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if is_student:
        today_progress = (
            db.query(func.count(models.StudySetProgress.progress_id))
            .filter(
                and_(
                    models.StudySetProgress.user_id == current_user.user_id,
                    models.StudySetProgress.last_activity >= today_start,
                )
            )
            .scalar() or 0
        )
        
        avg_accuracy = (
            db.query(func.avg(models.StudySetProgress.mastery_percentage))
            .filter(
                and_(
                    models.StudySetProgress.user_id == current_user.user_id,
                    models.StudySetProgress.last_activity >= today_start,
                )
            )
            .scalar() or 0
        )
        
        time_spent = 0
        
        return {
            "questions_answered": today_progress,
            "accuracy": float(avg_accuracy) if avg_accuracy else 0,
            "time_spent": time_spent,
        }
    elif is_teacher:
        teacher_id = current_user.user_id
        
        classes_query = text("SELECT class_id FROM public.class WHERE teacher_id = :teacher_id")
        classes_result = db.execute(classes_query, {"teacher_id": teacher_id})
        class_ids = [row[0] for row in classes_result] if classes_result else []
        
        if class_ids:
            placeholders = ','.join([f':id_{i}' for i in range(len(class_ids))])
            enrollment_query = text(f"""
                SELECT COUNT(DISTINCT user_id) 
                FROM public.enrollment 
                WHERE class_id IN ({placeholders})
            """)
            params = {f'id_{i}': class_ids[i] for i in range(len(class_ids))}
            active_students_result = db.execute(enrollment_query, params)
            active_students = active_students_result.scalar() or 0
        else:
            active_students = 0
        
        assignments_submitted = (
            db.query(func.count(models.StudySetAssignment.assignment_id))
            .join(models.StudySet)
            .filter(models.StudySet.creator_id == current_user.user_id)
            .scalar() or 0
        )
        
        classes_active = len(class_ids)
        
        return {
            "active_students": active_students,
            "assignments_submitted": assignments_submitted,
            "classes_active": classes_active,
        }
    
    return {}


@router.get("/dashboard/assignments")
def get_dashboard_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return []
    
    assignments_query = (
        db.query(
            models.StudySetAssignment.assignment_id,
            models.StudySet.title,
            models.StudySetAssignment.due_date,
            models.StudySet.set_id,
        )
        .join(models.StudySet, models.StudySetAssignment.set_id == models.StudySet.set_id)
        .join(
            models.StudySetStudentAssignment,
            models.StudySetAssignment.assignment_id == models.StudySetStudentAssignment.assignment_id,
        )
        .filter(models.StudySetStudentAssignment.user_id == current_user.user_id)
        .order_by(models.StudySetAssignment.due_date.asc().nullslast())
        .limit(10)
    )
    
    assignments = []
    for assignment in assignments_query.all():
        progress = (
            db.query(models.StudySetProgress)
            .filter(
                and_(
                    models.StudySetProgress.set_id == assignment.set_id,
                    models.StudySetProgress.user_id == current_user.user_id,
                )
            )
            .first()
        )
        
        if progress and progress.mastery_percentage and float(progress.mastery_percentage) >= 100:
            status = "Completed"
        elif progress:
            status = "In progress"
        else:
            status = "Not started"
        
        assignments.append({
            "id": assignment.assignment_id,
            "title": assignment.title,
            "due": assignment.due_date.strftime("%Y-%m-%d") if assignment.due_date else None,
            "status": status,
            "set_id": assignment.set_id,
        })
    
    return assignments


@router.get("/dashboard/recommendations")
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return []
    
    enrolled_class_ids = []
    enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
    enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
    enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
    
    recommendations = []
    
    if enrolled_class_ids:
        class_assignments = (
            db.query(models.StudySet)
            .join(models.StudySetAssignment)
            .filter(
                and_(
                    models.StudySetAssignment.class_id.in_(enrolled_class_ids),
                    ~models.StudySet.set_id.in_(
                        db.query(models.StudySetProgress.set_id).filter(
                            models.StudySetProgress.user_id == current_user.user_id
                        )
                    ),
                )
            )
            .limit(3)
        )
        
        for study_set in class_assignments.all():
            recommendations.append({
                "topic": study_set.title,
                "reason": "New assignment in your class",
                "difficulty": study_set.level or "Medium",
                "set_id": study_set.set_id,
            })
    
    low_mastery = (
        db.query(models.StudySet)
        .join(models.StudySetProgress)
        .filter(
            and_(
                models.StudySetProgress.user_id == current_user.user_id,
                models.StudySetProgress.mastery_percentage < 70,
            )
        )
        .order_by(models.StudySetProgress.mastery_percentage.asc())
        .limit(3 - len(recommendations))
    )
    
    for study_set in low_mastery.all():
        recommendations.append({
            "topic": study_set.title,
            "reason": "You missed questions last time",
            "difficulty": study_set.level or "Medium",
            "set_id": study_set.set_id,
        })
    
    return recommendations


@router.get("/recommendations/next")
def get_next_recommendation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the next recommended study set for the current user based on their performance."""
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        raise HTTPException(status_code=403, detail="Only students can get recommendations")
    
    recommendation = get_next_recommended_study_set(current_user.user_id, db)
    
    if not recommendation:
        return {
            "studySetId": None,
            "title": None,
            "topic": None,
            "difficulty": None,
            "reason": "No recommendations available at this time.",
        }
    
    return recommendation


@router.get("/dashboard/leaderboard")
def get_leaderboard(
    class_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return {"leaderboard": [], "current_user_rank": None}
    
    enrolled_class_ids = []
    if class_id:
        enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id AND class_id = :class_id")
        result = db.execute(enrollment_query, {"user_id": current_user.user_id, "class_id": class_id})
        if result.fetchone():
            enrolled_class_ids = [class_id]
    else:
        enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
        enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": current_user.user_id})
        enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []
    
    if not enrolled_class_ids:
        return {"leaderboard": [], "current_user_rank": None}
    
    student_ids_query = text("SELECT DISTINCT user_id FROM public.enrollment WHERE class_id = ANY(:class_ids)")
    student_ids_result = db.execute(student_ids_query, {"class_ids": enrolled_class_ids})
    student_ids = [row[0] for row in student_ids_result] if student_ids_result else []
    
    if not student_ids:
        return {"leaderboard": [], "current_user_rank": None}
    
    leaderboard_data = []
    processed_user_ids = set()  # Track processed users to avoid duplicates
    for student_id in student_ids:
        if student_id in processed_user_ids:
            continue  # Skip if already processed
        processed_user_ids.add(student_id)
        total_points = (
            db.query(func.sum(models.StudySetProgress.mastery_percentage))
            .filter(models.StudySetProgress.user_id == student_id)
            .scalar() or 0
        )
        
        user = db.query(User).filter(User.user_id == student_id).first()
        if user:
            leaderboard_data.append({
                "user_id": student_id,
                "name": user.name,
                "points": int(float(total_points)),
            })
    
    leaderboard_data.sort(key=lambda x: x["points"], reverse=True)
    
    leaderboard = []
    for idx, entry in enumerate(leaderboard_data[:10], 1):
        leaderboard.append({
            "rank": idx,
            "name": entry["name"],
            "points": entry["points"],
        })
    
    current_user_rank = None
    for idx, entry in enumerate(leaderboard_data, 1):
        if entry["user_id"] == current_user.user_id:
            current_user_rank = {
                "rank": idx,
                "name": current_user.name,
                "points": entry["points"],
            }
            break
    
    return {"leaderboard": leaderboard, "current_user_rank": current_user_rank}


@router.get("/gamification/badges")
def get_all_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return {"earned_badges": [], "available_badges": []}
    
    today = datetime.utcnow().date()
    streak = 0
    current_date = today
    
    while True:
        date_start = datetime.combine(current_date, datetime.min.time())
        date_end = datetime.combine(current_date, datetime.max.time())
        
        has_activity = (
            db.query(models.StudySetProgress)
            .filter(
                and_(
                    models.StudySetProgress.user_id == current_user.user_id,
                    models.StudySetProgress.last_activity >= date_start,
                    models.StudySetProgress.last_activity <= date_end,
                )
            )
            .first()
        )
        
        if not has_activity:
            break
        
        streak += 1
        current_date = (datetime.combine(current_date, datetime.min.time()) - timedelta(days=1)).date()
    
    total_quizzes = (
        db.query(func.count(func.distinct(models.StudySetProgress.set_id)))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    
    total_points = (
        db.query(func.sum(models.StudySetProgress.mastery_percentage))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    total_points = int(float(total_points)) if total_points else 0
    
    high_accuracy_count = (
        db.query(func.count(models.StudySetProgress.progress_id))
        .filter(
            and_(
                models.StudySetProgress.user_id == current_user.user_id,
                models.StudySetProgress.mastery_percentage >= 90,
            )
        )
        .scalar() or 0
    )
    
    earned_badges = []
    if streak >= 3:
        earned_badges.append({"name": "Consistency", "icon": "🔥", "description": f"{streak}-day streak", "earned": True})
    if total_quizzes >= 5:
        earned_badges.append({"name": "Quick Learner", "icon": "⚡", "description": f"{total_quizzes} quizzes completed", "earned": True})
    if streak >= 7:
        earned_badges.append({"name": "Week Warrior", "icon": "💪", "description": "7+ day streak", "earned": True})
    if total_quizzes >= 10:
        earned_badges.append({"name": "Quiz Master", "icon": "🏆", "description": f"{total_quizzes} quizzes completed", "earned": True})
    if total_points >= 1000:
        earned_badges.append({"name": "Point Collector", "icon": "⭐", "description": f"{total_points} points earned", "earned": True})
    if high_accuracy_count >= 5:
        earned_badges.append({"name": "Perfectionist", "icon": "✨", "description": f"{high_accuracy_count} perfect scores", "earned": True})
    
    available_badges = []
    if streak < 3:
        available_badges.append({"name": "Consistency", "icon": "🔥", "description": "Maintain a 3-day streak", "earned": False, "progress": streak, "target": 3})
    if total_quizzes < 5:
        available_badges.append({"name": "Quick Learner", "icon": "⚡", "description": "Complete 5 quizzes", "earned": False, "progress": total_quizzes, "target": 5})
    if streak < 7:
        available_badges.append({"name": "Week Warrior", "icon": "💪", "description": "Maintain a 7-day streak", "earned": False, "progress": streak, "target": 7})
    if total_quizzes < 10:
        available_badges.append({"name": "Quiz Master", "icon": "🏆", "description": "Complete 10 quizzes", "earned": False, "progress": total_quizzes, "target": 10})
    if total_points < 1000:
        available_badges.append({"name": "Point Collector", "icon": "⭐", "description": "Earn 1000 points", "earned": False, "progress": total_points, "target": 1000})
    if high_accuracy_count < 5:
        available_badges.append({"name": "Perfectionist", "icon": "✨", "description": "Get 5 perfect scores", "earned": False, "progress": high_accuracy_count, "target": 5})
    
    return {"earned_badges": earned_badges, "available_badges": available_badges}


@router.get("/gamification/points")
def get_points_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return {"total_points": 0, "breakdown": {}}
    
    total_points = (
        db.query(func.sum(models.StudySetProgress.mastery_percentage))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    total_points = int(float(total_points)) if total_points else 0
    
    total_quizzes = (
        db.query(func.count(func.distinct(models.StudySetProgress.set_id)))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    
    avg_accuracy = (
        db.query(func.avg(models.StudySetProgress.mastery_percentage))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    avg_accuracy = float(avg_accuracy) if avg_accuracy else 0
    
    return {
        "total_points": total_points,
        "total_quizzes": total_quizzes,
        "average_accuracy": round(avg_accuracy, 1),
        "breakdown": {
            "from_quizzes": total_points,
            "streak_bonus": 0,
            "accuracy_bonus": 0,
        }
    }


@router.get("/dashboard/streaks")
def get_streaks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role and current_user.role.name.lower() == "student"
    
    if not is_student:
        return {"streak": 0, "badges": [], "next_badge": None}
    
    today = datetime.utcnow().date()
    streak = 0
    current_date = today
    
    while True:
        date_start = datetime.combine(current_date, datetime.min.time())
        date_end = datetime.combine(current_date, datetime.max.time())
        
        has_activity = (
            db.query(models.StudySetProgress)
            .filter(
                and_(
                    models.StudySetProgress.user_id == current_user.user_id,
                    models.StudySetProgress.last_activity >= date_start,
                    models.StudySetProgress.last_activity <= date_end,
                )
            )
            .first()
        )
        
        if not has_activity:
            break
        
        streak += 1
        current_date = (datetime.combine(current_date, datetime.min.time()) - timedelta(days=1)).date()
    
    total_quizzes = (
        db.query(func.count(func.distinct(models.StudySetProgress.set_id)))
        .filter(models.StudySetProgress.user_id == current_user.user_id)
        .scalar() or 0
    )
    
    badges = []
    if streak >= 3:
        badges.append({"name": "Consistency", "icon": "🔥"})
    if total_quizzes >= 5:
        badges.append({"name": "Quick Learner", "icon": "⚡"})
    
    next_badge = None
    if total_quizzes < 5:
        next_badge = {"name": "Quiz Master", "progress": total_quizzes, "target": 5}
    elif streak < 7:
        next_badge = {"name": "Week Warrior", "progress": streak, "target": 7}
    
    return {
        "streak": streak,
        "badges": badges,
        "next_badge": next_badge,
    }

