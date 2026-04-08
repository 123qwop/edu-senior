from typing import Optional

from pydantic import BaseModel, Field


class AdminUserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: Optional[str] = None


class AdminRolePatch(BaseModel):
    role: str = Field(..., min_length=1, max_length=50)


class AdminStudySetOut(BaseModel):
    id: int
    title: str
    subject: Optional[str] = None
    type: str
    creator_id: int
    creator_name: str
    creator_email: str
