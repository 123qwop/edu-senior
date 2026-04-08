"""
Call Google Gemini (Google AI Studio API key). Set GEMINI_API_KEY in .env.
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

# Default model: fast and usually available on free tier; override with GEMINI_MODEL
DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiQuotaExceededError(Exception):
    """Raised when Google returns 429 / quota exhausted."""

    pass


def _api_key() -> Optional[str]:
    return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip() or None


def is_configured() -> bool:
    return _api_key() is not None


def _extract_text(response) -> str:
    try:
        text = response.text
        if text and text.strip():
            return text.strip()
    except ValueError:
        pass
    return (
        "The model could not produce text for this request (safety filters or empty response). "
        "Try shortening your question or rephrasing."
    )


def generate_text_sync(
    user_prompt: str,
    *,
    system_instruction: Optional[str] = None,
    max_output_tokens: int = 2048,
) -> str:
    import google.generativeai as genai

    key = _api_key()
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set. Add it to backend/.env (see GEMINI_SETUP.md).")

    model_name = (os.getenv("GEMINI_MODEL") or DEFAULT_MODEL).strip()
    genai.configure(api_key=key)

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_instruction,
    )
    generation_config = genai.types.GenerationConfig(
        max_output_tokens=max_output_tokens,
        temperature=0.7,
    )
    try:
        response = model.generate_content(user_prompt, generation_config=generation_config)
    except Exception as e:
        msg = str(e)
        low = msg.lower()
        if (
            "429" in msg
            or "quota" in low
            or "resource exhausted" in low
            or "resourceexhausted" in low.replace(" ", "")
        ):
            raise GeminiQuotaExceededError(
                "Google Gemini quota exceeded (rate or daily limit). "
                "Wait a few minutes, try again later, or check usage and limits in "
                "Google AI Studio (https://aistudio.google.com/). "
                "Free tier has strict per-minute and per-day caps; billing can raise limits."
            ) from e
        raise
    return _extract_text(response)


async def generate_text(
    user_prompt: str,
    *,
    system_instruction: Optional[str] = None,
    max_output_tokens: int = 2048,
) -> str:
    """Non-blocking wrapper for FastAPI async routes."""
    return await asyncio.to_thread(
        generate_text_sync,
        user_prompt,
        system_instruction=system_instruction,
        max_output_tokens=max_output_tokens,
    )
