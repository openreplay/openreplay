from sys import intern
from pydantic import BaseModel


class LLMQuestion(BaseModel):
    question: str
    userId: int
    projectId: int

