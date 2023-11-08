from typing import Optional, List

from pydantic import Field, field_validator

from .overrides import BaseModel, Enum, ORUnion


class AssistStatsAverage(BaseModel):
    key: str = Field(...)
    avg: float = Field(...)
    chartData: List[dict] = Field(...)


class AssistStatsMember(BaseModel):
    name: str
    count: int
    assist_duration: Optional[int] = Field(default=0)
    call_duration: Optional[int] = Field(default=0)
    control_duration: Optional[int] = Field(default=0)
    assist_count: Optional[int] = Field(default=0)


class AssistStatsSessionAgent(BaseModel):
    name: str
    id: int


class AssistStatsTopMembersResponse(BaseModel):
    total: int
    list: List[AssistStatsMember]


class AssistStatsSessionRecording(BaseModel):
    recordId: int = Field(...)
    name: str = Field(...)
    duration: int = Field(...)


class AssistStatsSession(BaseModel):
    sessionId: str = Field(...)
    timestamp: int = Field(...)
    teamMembers: List[AssistStatsSessionAgent] = Field(...)
    assistDuration: Optional[int] = Field(default=0)
    callDuration: Optional[int] = Field(default=0)
    controlDuration: Optional[int] = Field(default=0)
    # recordings: list[AssistStatsSessionRecording] = Field(default=[])


assist_sort_options = ["timestamp", "assist_duration", "call_duration", "control_duration"]


class AssistStatsSessionsRequest(BaseModel):
    startTimestamp: int = Field(...)
    endTimestamp: int = Field(...)
    limit: Optional[int] = Field(default=10)
    page: Optional[int] = Field(default=1)
    sort: Optional[str] = Field(default="timestamp",
                                enum=assist_sort_options)
    order: Optional[str] = Field(default="desc", choices=["desc", "asc"])
    userId: Optional[int] = Field(default=None)

    @field_validator("sort")
    def validate_sort(cls, v):
        if v not in assist_sort_options:
            raise ValueError(f"Invalid sort option. Allowed options: {', '.join(assist_sort_options)}")
        return v

    @field_validator("order")
    def validate_order(cls, v):
        if v not in ["desc", "asc"]:
            raise ValueError("Invalid order option. Must be 'desc' or 'asc'.")
        return v


class AssistStatsSessionsResponse(BaseModel):
    total: int = Field(...)
    page: int = Field(...)
    list: List[AssistStatsSession] = Field(default=[])
