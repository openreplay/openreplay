from typing import Optional, List

from pydantic import BaseModel, Field

import schemas


class RolePayloadSchema(BaseModel):
    name: str = Field(...)
    description: Optional[str] = Field(None)
    permissions: List[str] = Field(...)
    all_projects: bool = Field(True)
    projects: List[int] = Field([])

    class Config:
        alias_generator = schemas.attribute_to_camel_case


class CreateMemberSchema(schemas.CreateMemberSchema):
    roleId: Optional[int] = Field(None)


class EditMemberSchema(schemas.EditMemberSchema):
    roleId: int = Field(...)
