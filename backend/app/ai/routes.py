"""
Authenticated AI endpoints backed by Google Gemini.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.ai import schemas
from app.ai.gemini_service import generate_text, is_configured, GeminiQuotaExceededError
from app.auth.deps import get_current_user
from app.auth.models import User

router = APIRouter()


async def _safe_generate(*args, **kwargs):
    try:
        return await generate_text(*args, **kwargs)
    except GeminiQuotaExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e


def _require_gemini():
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are not configured (missing GEMINI_API_KEY).",
        )


SYSTEM_TUTOR = (
    "You are a helpful, concise tutor for students. "
    "Use clear language, be encouraging, and avoid harmful content. "
    "If the topic is unclear, still give a reasonable educational response."
)


def _response_language_clause(response_language: Optional[str]) -> str:
    """Tell the model which language to write in (matches app i18n: en, ru, kz)."""
    if not response_language:
        return ""
    code = response_language.strip().lower().split("-", 1)[0]
    if code == "ru":
        return (
            "\n\nLanguage: Write your entire response in Russian, matching the student's interface language."
        )
    if code in ("kz", "kk"):
        return (
            "\n\nLanguage: Write your entire response in Kazakh, matching the student's interface language."
        )
    if code == "en":
        return "\n\nLanguage: Write your entire response in English."
    return ""


@router.get("/status")
def ai_status():
    """Whether the server has a Gemini API key (no key value exposed)."""
    return {"enabled": is_configured()}


@router.post("/explain", response_model=schemas.AiTextResponse)
async def explain_answer(
    body: schemas.ExplainAnswerRequest,
    current_user: User = Depends(get_current_user),
):
    _require_gemini()
    parts = [
        "Explain the following to the student in 2–5 short paragraphs.",
        "Focus on why their answer is right or wrong and the underlying concept.",
        f"Question: {body.question}",
        f"Student's answer: {body.user_answer}",
    ]
    if body.correct_answer:
        parts.append(f"Correct / expected answer (for reference): {body.correct_answer}")
    if body.subject:
        parts.append(f"Subject: {body.subject}")
    prompt = "\n".join(parts) + _response_language_clause(body.response_language)
    text = await _safe_generate(prompt, system_instruction=SYSTEM_TUTOR, max_output_tokens=2048)
    return schemas.AiTextResponse(text=text)


@router.post("/hint", response_model=schemas.AiTextResponse)
async def study_hint(
    body: schemas.HintRequest,
    current_user: User = Depends(get_current_user),
):
    _require_gemini()
    topic = body.topic or "general"
    prompt = (
        f"Give ONE short hint (3–6 sentences max) for this study question. "
        f"Do NOT state the direct final answer or copy multiple-choice options as the answer.\n\n"
        f"Topic: {topic}\n\nQuestion:\n{body.question}"
    ) + _response_language_clause(body.response_language)
    text = await _safe_generate(prompt, system_instruction=SYSTEM_TUTOR, max_output_tokens=512)
    return schemas.AiTextResponse(text=text)


@router.post("/feedback", response_model=schemas.AiTextResponse)
async def personalized_feedback(
    body: schemas.FeedbackRequest,
    current_user: User = Depends(get_current_user),
):
    _require_gemini()
    status_word = "correct" if body.is_correct else "incorrect"
    prompt = (
        f"The student was {status_word} on this question.\n"
        f"Write 2–4 sentences of encouraging, specific feedback.\n"
        f"Question: {body.question}\n"
        f"Student answer: {body.user_answer}\n"
    )
    if body.correct_answer:
        prompt += f"Reference answer: {body.correct_answer}\n"
    if body.topic:
        prompt += f"Topic: {body.topic}\n"
    prompt += _response_language_clause(body.response_language)
    text = await _safe_generate(prompt, system_instruction=SYSTEM_TUTOR, max_output_tokens=512)
    return schemas.AiTextResponse(text=text)


@router.post("/generate-questions", response_model=schemas.AiTextResponse)
async def generate_questions(
    body: schemas.GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
):
    _require_gemini()
    qtype = (body.question_type or "multiple_choice").lower().replace("-", "_")
    prompt = (
        f"Generate exactly {body.count} draft {qtype} questions about: {body.topic}\n"
        f"Difficulty: {body.difficulty}.\n"
        "Format as numbered list. For multiple_choice, show 4 options and mark the correct one.\n"
        "These are drafts — note that a teacher should review before use.\n"
        "Keep each question concise."
    )
    sys = SYSTEM_TUTOR + " Output plain text only, no markdown code blocks."
    text = await _safe_generate(prompt, system_instruction=sys, max_output_tokens=4096)
    return schemas.AiTextResponse(text=text)
