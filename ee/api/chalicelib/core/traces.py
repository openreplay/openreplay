import json
import logging
import re
from typing import Optional

from fastapi import Request, Response
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from chalicelib.utils import pg_client
from schemas import CurrentContext

logger: logging.Logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

IGNORE_ROUTES = [
    {"method": ["*"], "path": "/notifications"},
    {"method": ["*"], "path": "/announcements"},
    {"method": ["*"], "path": "/client"},
    {"method": ["*"], "path": "/account"},
    {"method": ["GET"], "path": "/projects"},
    {"method": ["*"], "path": "/{projectId}/sessions/search2"},
    {"method": ["GET"], "path": "/{projectId}/sessions2/favorite"},
    {"method": ["GET"], "path": re.compile("^/{projectId}/sessions2/{sessionId}/.*")},
    {"method": ["GET"], "path": "/{projectId}/sample_rate"},
    {"method": ["GET"], "path": "/boarding"},
    {"method": ["GET"], "path": "/{projectId}/metadata"},
    {"method": ["GET"], "path": "/{projectId}/integration/sources"},
    {"method": ["GET"], "path": "/{projectId}/funnels"},
    {"method": ["GET"], "path": "/integrations/slack/channels"},
    {"method": ["GET"], "path": "/webhooks"},
    {"method": ["GET"], "path": "/{projectId}/alerts"},
    {"method": ["GET"], "path": "/client/members"},
    {"method": ["GET"], "path": "/announcements/view"},
    {"method": ["GET"], "path": "/config/weekly_report"},
    {"method": ["GET"], "path": "/{projectId}/events/search"},
    {"method": ["POST"], "path": "/{projectId}/errors/search"},
    {"method": ["GET"], "path": "/{projectId}/errors/stats"},
    {"method": ["GET"], "path": re.compile("^/{projectId}/errors/{errorId}/.*")},
    {"method": ["GET"], "path": re.compile("^/integrations/.*")},
    {"method": ["*"], "path": re.compile("^/{projectId}/dashboard/.*")},
    {"method": ["*"], "path": re.compile("^/{projectId}/funnels$")},
    {"method": ["*"], "path": re.compile("^/{projectId}/funnels/.*")},
]
IGNORE_IN_PAYLOAD = ["token", "password", "authorizationToken", "authHeader", "xQueryKey", "awsSecretAccessKey",
                     "serviceAccountCredentials", "accessKey", "applicationKey", "apiKey"]


class TraceSchema(BaseModel):
    user_id: int = Field(...)
    action: str = Field(...)
    method: str = Field(...)
    path_format: str = Field(...)
    endpoint: str = Field(...)
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
                f"""INSERT INTO traces(user_id, action, method, path_format, endpoint, payload, parameters, status)
                    VALUES (%(user_id)s, %(action)s, %(method)s, %(path_format)s, %(endpoint)s, %(payload)s::jsonb, %(parameters)s::jsonb, %(status)s);""",
                data)
        )


async def process_trace(action: str, path_format: str, request: Request, response: Response):
    if not hasattr(request.state, "currentContext"):
        return
    current_context: CurrentContext = request.state.currentContext
    body: json = None
    if request.method in ["POST", "PUT", "DELETE"]:
        body = await request.json()
        intersect = list(set(body.keys()) & set(IGNORE_IN_PAYLOAD))
        for attribute in intersect:
            body[attribute] = "HIDDEN"
    current_trace = TraceSchema(user_id=current_context.user_id, action=action,
                                endpoint=str(request.url.path), method=request.method,
                                payload=body,
                                parameters=dict(request.query_params),
                                status=response.status_code,
                                path_format=path_format)
    await write_trace(current_trace)


def trace(action: str, path_format: str, request: Request, response: Response):
    for p in IGNORE_ROUTES:
        if (isinstance(p["path"], str) and p["path"] == path_format \
            or isinstance(p["path"], re.Pattern) and re.search(p["path"], path_format)) \
                and (p["method"][0] == "*" or request.method in p["method"]):
            return
    response.background = BackgroundTask(process_trace, action, path_format, request, response)
