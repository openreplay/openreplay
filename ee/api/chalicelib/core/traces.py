import json
import logging
from typing import Optional

from fastapi import Request, Response
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from chalicelib.utils import pg_client
from schemas import CurrentContext

logger: logging.Logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class TraceSchema(BaseModel):
    user_id: int = Field(...)
    action: str = Field(...)
    endpoint: str = Field(...)
    method: str = Field(...)
    payload: Optional[dict] = Field(None)
    parameters: Optional[dict] = Field(None)
    status: Optional[int] = Field(None)


async def write_trace(trace: TraceSchema):
    data = trace.dict()
    data["parameters"] = json.dumps(trace.parameters) if trace.parameters is not None and len(
        trace.parameters.keys()) > 0 else None
    data["payload"] = json.dumps(trace.payload) if trace.payload is not None and len(trace.payload.keys()) > 0 else None
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""INSERT INTO traces(user_id, action, method, endpoint, payload, parameters, status)
                    VALUES (%(user_id)s, %(action)s, %(method)s, %(endpoint)s, %(payload)s::jsonb, %(parameters)s::jsonb, %(status)s);""",
                data)
        )


async def process_trace(request: Request, response: Response):
    current_context: CurrentContext = request.state.currentContext
    body = None
    if request.method in ["POST", "PUT", "DELETE"]:
        body = await request.json()
    current_trace = TraceSchema(user_id=current_context.user_id, action="",
                                endpoint=str(request.url.path), method=request.method,
                                payload=body,
                                parameters=dict(request.query_params),
                                status=response.status_code)
    await write_trace(current_trace)


def trace(request: Request, response: Response):
    response.background = BackgroundTask(process_trace, request, response)
