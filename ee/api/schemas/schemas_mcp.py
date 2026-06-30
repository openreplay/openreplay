from pydantic import Field

from .overrides import BaseModel


class AuthorizeSchema(BaseModel):
    state: str = Field(...)
    # client_id is to identify the running MCP app for a client
    client_id: str = Field(...)
