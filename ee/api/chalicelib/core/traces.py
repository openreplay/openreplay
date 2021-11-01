import json
import logging
from typing import Optional

from fastapi import Request
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


def write_trace(trace: TraceSchema):
    data = trace.dict()
    data["parameters"] = json.dumps(trace.parameters)
    data["payload"] = json.dumps(trace.payload)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""INSERT INTO traces(user_id, action, method, endpoint, payload, parameters)
                    VALUES (%(user_id)s, %(action)s, %(method)s, %(endpoint)s, %(payload)s::jsonb, %(parameters)s::jsonb);""",
                data)
        )


# def trace(request: Request,background_tasks: BackgroundTasks=Depends(BackgroundTasks())):
def trace(request: Request):
    current_context: CurrentContext = request.state.currentContext
    current_trace = TraceSchema(user_id=current_context.user_id, action="",
                                endpoint=str(request.url.path), method=request.method,
                                # payload=request.body().__dict__,
                                parameters=dict(request.query_params))
    # print(trace)
    # TODO: find a way to start a background task
    # BackgroundTask(write_trace, current_trace)
    write_trace(current_trace)
