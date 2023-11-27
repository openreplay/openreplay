from typing import Optional, List
from pydantic import Field
from datetime import datetime
from enum import Enum
from schemas import BaseModel

from pydantic.v1 import validator


class StatusEnum(str, Enum):
    preview = 'preview'
    in_progress = 'in-progress'
    paused = 'paused'
    closed = 'closed'


class UTTestTask(BaseModel):
    task_id: Optional[int] = Field(None, description="The unique identifier of the task")
    test_id: Optional[int] = Field(None, description="The unique identifier of the usability test")
    title: str = Field(..., description="The title of the task")
    description: Optional[str] = Field(None, description="A detailed description of the task")
    allow_typing: Optional[bool] = Field(False, description="Indicates if the user is allowed to type")


class UTTestBase(BaseModel):
    title: str = Field(..., description="The title of the usability test")
    project_id: Optional[int] = Field(None, description="The ID of the associated project")
    created_by: Optional[int] = Field(None, description="The ID of the user who created the test")
    starting_path: Optional[str] = Field(None, description="The starting path for the usability test")
    status: Optional[StatusEnum] = Field(StatusEnum.in_progress, description="The current status of the usability test")
    require_mic: bool = Field(False, description="Indicates if a microphone is required")
    require_camera: bool = Field(False, description="Indicates if a camera is required")
    description: Optional[str] = Field(None, description="A detailed description of the usability test")
    guidelines: Optional[str] = Field(None, description="Guidelines for the usability test")
    conclusion_message: Optional[str] = Field(None, description="Conclusion message for the test participants")
    visibility: bool = Field(False, description="Flag to indicate if the test is visible to the public")
    tasks: Optional[List[UTTestTask]] = Field(None, description="List of tasks for the usability test")


class UTTestCreate(UTTestBase):
    pass


class UTTestStatusUpdate(BaseModel):
    status: StatusEnum = Field(..., description="The updated status of the usability test")


class UTTestRead(UTTestBase):
    test_id: int = Field(..., description="The unique identifier of the usability test")
    created_by: Optional[int] = Field(None, description="The ID of the user who created the test")
    updated_by: Optional[int] = Field(None, description="The ID of the user who last updated the test")
    created_at: datetime = Field(..., description="The timestamp when the test was created")
    updated_at: datetime = Field(..., description="The timestamp when the test was last updated")
    deleted_at: Optional[datetime] = Field(None, description="The timestamp when the test was deleted, if applicable")


class UTTestUpdate(BaseModel):
    # Optional fields for updating the usability test
    title: Optional[str] = Field(None, description="The updated title of the usability test")
    status: Optional[StatusEnum] = Field(None, description="The updated status of the usability test")
    description: Optional[str] = Field(None, description="The updated description of the usability test")
    starting_path: Optional[str] = Field(None, description="The updated starting path for the usability test")
    require_mic: Optional[bool] = Field(None, description="Indicates if a microphone is required")
    require_camera: Optional[bool] = Field(None, description="Indicates if a camera is required")
    guidelines: Optional[str] = Field(None, description="Updated guidelines for the usability test")
    conclusion_message: Optional[str] = Field(None, description="Updated conclusion message for the test participants")
    visibility: Optional[bool] = Field(None, description="Flag to indicate if the test is visible to the public")
    tasks: Optional[List[UTTestTask]] = Field([], description="List of tasks for the usability test")


class UTTestDelete(BaseModel):
    # You would usually not need a model for deletion, but let's assume you need to confirm the deletion timestamp
    deleted_at: datetime = Field(..., description="The timestamp when the test is marked as deleted")


class UTTestSearch(BaseModel):
    query: Optional[str] = Field(None, description="Search query for the UT tests")
    page: Optional[int] = Field(1, ge=1, description="Page number of the results")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Number of results per page")
    sort_by: Optional[str] = Field(description="Field to sort by", default="created_at")
    sort_order: Optional[str] = Field("asc", description="Sort order: 'asc' or 'desc'")
    is_active: Optional[bool] = Field(True, description="Flag to indicate if the test is active")
    user_id: Optional[int] = Field(None, description="The ID of the user who created the test")

    @validator('sort_order')
    def sort_order_must_be_valid(cls, v):
        if v not in ['asc', 'desc']:
            raise ValueError('Sort order must be either "asc" or "desc"')
        return v


class UTTestResponsesSearch(BaseModel):
    query: Optional[str] = Field(None, description="Search query for the UT responses")
    page: Optional[int] = Field(1, ge=1, description="Page number of the results")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Number of results per page")


class UTTestSignal(BaseModel):
    signal_id: int = Field(..., description="The unique identifier of the response")
    test_id: int = Field(..., description="The unique identifier of the usability test")
    session_id: int = Field(..., description="The unique identifier of the session")
    type: str = Field(..., description="The type of the signal")
    type_id: int = Field(..., description="The unique identifier of the type")
    status: str = Field(..., description="The status of the signal")
    comment: Optional[str] = Field(None, description="The comment for the signal")
    timestamp: datetime = Field(..., description="The timestamp when the signal was created")


class UTTestResponse(BaseModel):
    test_id: int = Field(..., description="The unique identifier of the usability test")
    response_id: str = Field(..., description="The type of the signal")
    status: str = Field(..., description="The status of the signal")
    comment: Optional[str] = Field(None, description="The comment for the signal")
    timestamp: datetime = Field(..., description="The timestamp when the signal was created")


class UTTestSession(BaseModel):
    test_id: int = Field(..., description="The unique identifier of the usability test")
    session_id: int = Field(..., description="The unique identifier of the session")
    status: str = Field(..., description="The status of the signal")
    timestamp: datetime = Field(..., description="The timestamp when the signal was created")


class UTTestSessionsSearch(BaseModel):
    page: Optional[int] = Field(1, ge=1, description="Page number of the results")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Number of results per page")
    status: Optional[str] = Field(None, description="The status of the session")


class SearchResult(BaseModel):
    results: List[UTTestRead]
    total: int
    page: int
    limit: int
