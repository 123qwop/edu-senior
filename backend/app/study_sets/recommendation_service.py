from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from decimal import Decimal
from typing import Optional, Dict, Any
from app.study_sets import models


def get_next_recommended_study_set(user_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    Get the next recommended study set for a student based on their performance.
    
    Rules:
    1. If accuracy on most recent set for a topic is below 60%, recommend:
       - Another set of the same difficulty in the same topic
       - Or the same set again if only one exists
    2. If accuracy is 60% or higher, recommend:
       - Next higher difficulty set in the same topic if available
    3. If no history, return default beginner set (lowest difficulty or first set)
    """
    
    # Get student's recent performance grouped by topic/subject and difficulty/level
    recent_progress = (
        db.query(
            models.StudySetProgress,
            models.StudySet
        )
        .join(models.StudySet, models.StudySetProgress.set_id == models.StudySet.set_id)
        .filter(models.StudySetProgress.user_id == user_id)
        .order_by(models.StudySetProgress.last_activity.desc())
        .all()
    )
    
    if not recent_progress:
        # No history - return default beginner set
        return get_default_beginner_set(user_id, db)
    
    # Get the most recent study set attempt
    most_recent_progress, most_recent_set = recent_progress[0]
    most_recent_accuracy = float(most_recent_progress.mastery_percentage)
    most_recent_topic = most_recent_set.subject
    most_recent_difficulty = most_recent_set.level
    
    # Rule 1: If accuracy < 60%, recommend same difficulty in same topic
    if most_recent_accuracy < 60:
        # Try to find another set with same topic and difficulty
        recommended = (
            db.query(models.StudySet)
            .filter(
                and_(
                    models.StudySet.subject == most_recent_topic,
                    models.StudySet.level == most_recent_difficulty,
                    models.StudySet.set_id != most_recent_set.set_id,
                    # Only recommend sets the student hasn't completed or has low mastery on
                    ~models.StudySet.set_id.in_(
                        db.query(models.StudySetProgress.set_id)
                        .filter(
                            and_(
                                models.StudySetProgress.user_id == user_id,
                                models.StudySetProgress.mastery_percentage >= 80
                            )
                        )
                    )
                )
            )
            .first()
        )
        
        if recommended:
            return {
                "studySetId": recommended.set_id,
                "title": recommended.title,
                "topic": recommended.subject or "General",
                "difficulty": recommended.level or "Medium",
                "reason": f"You scored {most_recent_accuracy:.0f}% on {most_recent_set.title}. Practice more at the same level to improve.",
            }
        
        # If no other set found, recommend the same set again
        return {
            "studySetId": most_recent_set.set_id,
            "title": most_recent_set.title,
            "topic": most_recent_set.subject or "General",
            "difficulty": most_recent_set.level or "Medium",
            "reason": f"You scored {most_recent_accuracy:.0f}% on this set. Try again to improve your score!",
        }
    
    # Rule 2: If accuracy >= 60%, recommend next higher difficulty in same topic
    if most_recent_accuracy >= 60:
        # Define difficulty levels (simple ordering)
        difficulty_levels = {
            "Beginner": 1,
            "Easy": 2,
            "Medium": 3,
            "Hard": 4,
            "Advanced": 5,
        }
        
        current_level = difficulty_levels.get(most_recent_difficulty or "Medium", 3)
        next_level = current_level + 1
        
        # Find sets with next higher difficulty
        next_difficulties = [k for k, v in difficulty_levels.items() if v == next_level]
        
        if next_difficulties and most_recent_topic:
            recommended = (
                db.query(models.StudySet)
                .filter(
                    and_(
                        models.StudySet.subject == most_recent_topic,
                        models.StudySet.level.in_(next_difficulties),
                        # Only recommend sets the student hasn't completed
                        ~models.StudySet.set_id.in_(
                            db.query(models.StudySetProgress.set_id)
                            .filter(
                                and_(
                                    models.StudySetProgress.user_id == user_id,
                                    models.StudySetProgress.mastery_percentage >= 80
                                )
                            )
                        )
                    )
                )
                .first()
            )
            
            if recommended:
                return {
                    "studySetId": recommended.set_id,
                    "title": recommended.title,
                    "topic": recommended.subject or "General",
                    "difficulty": recommended.level or "Medium",
                    "reason": f"Great job! You scored {most_recent_accuracy:.0f}% on {most_recent_set.title}. Ready for the next level?",
                }
        
        # If no higher difficulty found, recommend another set in same topic at same or similar level
        recommended = (
            db.query(models.StudySet)
            .filter(
                and_(
                    models.StudySet.subject == most_recent_topic,
                    models.StudySet.set_id != most_recent_set.set_id,
                    ~models.StudySet.set_id.in_(
                        db.query(models.StudySetProgress.set_id)
                        .filter(
                            and_(
                                models.StudySetProgress.user_id == user_id,
                                models.StudySetProgress.mastery_percentage >= 80
                            )
                        )
                    )
                )
            )
            .first()
        )
        
        if recommended:
            return {
                "studySetId": recommended.set_id,
                "title": recommended.title,
                "topic": recommended.subject or "General",
                "difficulty": recommended.level or "Medium",
                "reason": f"You did well on {most_recent_set.title}! Try another set in {most_recent_topic}.",
            }
    
    # Fallback: return default beginner set
    return get_default_beginner_set(user_id, db)


def get_default_beginner_set(user_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """Get a default beginner set for students with no history."""
    
    # Try to find a beginner/easy set the student hasn't completed
    beginner_set = (
        db.query(models.StudySet)
        .filter(
            and_(
                or_(
                    models.StudySet.level == "Beginner",
                    models.StudySet.level == "Easy",
                    models.StudySet.level.is_(None)
                ),
                ~models.StudySet.set_id.in_(
                    db.query(models.StudySetProgress.set_id)
                    .filter(
                        and_(
                            models.StudySetProgress.user_id == user_id,
                            models.StudySetProgress.mastery_percentage >= 80
                        )
                    )
                )
            )
        )
        .order_by(models.StudySet.created_at.asc())
        .first()
    )
    
    if beginner_set:
        return {
            "studySetId": beginner_set.set_id,
            "title": beginner_set.title,
            "topic": beginner_set.subject or "General",
            "difficulty": beginner_set.level or "Beginner",
            "reason": "Start your learning journey with this beginner-friendly set!",
        }
    
    # If no beginner set, just get any set they haven't completed
    any_set = (
        db.query(models.StudySet)
        .filter(
            ~models.StudySet.set_id.in_(
                db.query(models.StudySetProgress.set_id)
                .filter(
                    and_(
                        models.StudySetProgress.user_id == user_id,
                        models.StudySetProgress.mastery_percentage >= 80
                    )
                )
            )
        )
        .order_by(models.StudySet.created_at.asc())
        .first()
    )
    
    if any_set:
        return {
            "studySetId": any_set.set_id,
            "title": any_set.title,
            "topic": any_set.subject or "General",
            "difficulty": any_set.level or "Medium",
            "reason": "Try this study set to get started!",
        }
    
    return None



