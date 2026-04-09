from typing import Optional

from pydantic import BaseModel, Field


class ExplainAnswerRequest(BaseModel):
    """Ask for an explanation of the user's answer (does not grade — explains concepts)."""

    question: str = Field(..., min_length=1, max_length=8000)
    user_answer: str = Field(..., min_length=1, max_length=4000)
    correct_answer: Optional[str] = Field(None, max_length=4000)
    subject: Optional[str] = Field(None, max_length=200)
    # App UI language (e.g. en, ru, kz) so the model answers in the same language as the student.
    response_language: Optional[str] = Field(None, max_length=20)


class HintRequest(BaseModel):
    """Get a short hint without giving away the full answer."""

    question: str = Field(..., min_length=1, max_length=8000)
    topic: Optional[str] = Field(None, max_length=200)
    response_language: Optional[str] = Field(None, max_length=20)


class FeedbackRequest(BaseModel):
    """Short personalized feedback after an attempt."""

    question: str = Field(..., min_length=1, max_length=8000)
    user_answer: str = Field(..., max_length=4000)
    is_correct: bool
    correct_answer: Optional[str] = Field(None, max_length=4000)
    topic: Optional[str] = Field(None, max_length=200)
    response_language: Optional[str] = Field(None, max_length=20)


class GenerateQuestionsRequest(BaseModel):
    """Generate draft questions (teachers should review before using)."""

    topic: str = Field(..., min_length=1, max_length=500)
    difficulty: Optional[str] = Field("medium", max_length=50)
    count: int = Field(3, ge=1, le=8)
    question_type: Optional[str] = Field("multiple_choice", max_length=50)


class AiTextResponse(BaseModel):
    text: str
