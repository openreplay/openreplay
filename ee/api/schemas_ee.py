from typing import Optional, List

from pydantic import BaseModel, Field


class RolePayloadSchema(BaseModel):
    name: str = Field(...)
    description: Optional[str] = Field(None)
    permissions: List[str] = Field(...)
