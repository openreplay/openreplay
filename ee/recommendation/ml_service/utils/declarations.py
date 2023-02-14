from pydantic import Field
from pydantic import BaseModel


class ModelDescription(BaseModel):
    model_name: str = Field(...)
    model_version: int = Field(default=1)
