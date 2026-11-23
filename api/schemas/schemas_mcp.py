from pydantic import Field

from .overrides import BaseModel


class AuthorizeSchema(BaseModel):
    # state is the only secret protecting the public /v1/mcp/auth-status endpoint, so it must not be short
    state: str = Field(..., min_length=32)
    # client_id is to identify the running MCP app for a client
    client_id: str = Field(...)
