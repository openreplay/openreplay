from typing import Optional, List

from pydantic import BaseModel, Field

import schemas


class RolePayloadSchema(BaseModel):
    name: str = Field(...)
    description: Optional[str] = Field(None)
    permissions: List[str] = Field(...)


class CreateMemberSchema(schemas.CreateMemberSchema):
    roleId: int = Field(...)


class EditMemberSchema(schemas.EditMemberSchema):
    roleId: int = Field(...)
