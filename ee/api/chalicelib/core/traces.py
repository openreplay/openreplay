import json
import queue
import re
from typing import Optional, List

from decouple import config
from fastapi import Request, Response
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

import app as main_app
import schemas
import schemas_ee
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from schemas import CurrentContext

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
    {"method": ["GET"], "path": "/client/roles"},
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
    user_id: Optional[int] = Field(None)
    tenant_id: int = Field(...)
    auth: Optional[str] = Field(None)
    action: str = Field(...)
    method: str = Field(...)
    path_format: str = Field(...)
    endpoint: str = Field(...)
    payload: Optional[dict] = Field(None)
    parameters: Optional[dict] = Field(None)
    status: Optional[int] = Field(None)
    created_at: int = Field(...)


def __process_trace(trace: TraceSchema):
    data = trace.dict()
    data["parameters"] = json.dumps(trace.parameters) if trace.parameters is not None and len(
        trace.parameters.keys()) > 0 else None
    data["payload"] = json.dumps(trace.payload) if trace.payload is not None and len(trace.payload.keys()) > 0 else None
    return data


async def write_trace(trace: TraceSchema):
    data = __process_trace(trace)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""INSERT INTO traces(user_id, tenant_id, created_at, auth, action, method, path_format, endpoint, payload, parameters, status)
                    VALUES (%(user_id)s, %(tenant_id)s, %(created_at)s, %(auth)s, %(action)s, %(method)s, %(path_format)s, %(endpoint)s, %(payload)s::jsonb, %(parameters)s::jsonb, %(status)s);""",
                data)
        )


async def write_traces_batch(traces: List[TraceSchema]):
    if len(traces) == 0:
        return
    params = {}
    values = []
    for i, t in enumerate(traces):
        data = __process_trace(t)
        for key in data.keys():
            params[f"{key}_{i}"] = data[key]
        values.append(
            f"(%(user_id_{i})s, %(tenant_id_{i})s, %(created_at_{i})s, %(auth_{i})s, %(action_{i})s, %(method_{i})s, %(path_format_{i})s, %(endpoint_{i})s, %(payload_{i})s::jsonb, %(parameters_{i})s::jsonb, %(status_{i})s)")

    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""INSERT INTO traces(user_id, tenant_id, created_at, auth, action, method, path_format, endpoint, payload, parameters, status)
                    VALUES {" , ".join(values)};""",
                params)
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
    current_trace = TraceSchema(tenant_id=current_context.tenant_id,
                                user_id=current_context.user_id if isinstance(current_context, CurrentContext) \
                                    else None,
                                auth="jwt" if isinstance(current_context, CurrentContext) else "apiKey",
                                action=action,
                                endpoint=str(request.url.path), method=request.method,
                                payload=body,
                                parameters=dict(request.query_params),
                                status=response.status_code,
                                path_format=path_format,
                                created_at=TimeUTC.now())
    if not hasattr(main_app.app, "queue_system"):
        main_app.app.queue_system = queue.Queue()
    q: queue.Queue = main_app.app.queue_system
    q.put(current_trace)


def trace(action: str, path_format: str, request: Request, response: Response):
    for p in IGNORE_ROUTES:
        if (isinstance(p["path"], str) and p["path"] == path_format \
            or isinstance(p["path"], re.Pattern) and re.search(p["path"], path_format)) \
                and (p["method"][0] == "*" or request.method in p["method"]):
            return
    background_task: BackgroundTask = BackgroundTask(process_trace, action, path_format, request, response)
    if response.background is None:
        response.background = background_task
    else:
        response.background.add_task(background_task.func, *background_task.args, *background_task.kwargs)


async def process_traces_queue():
    queue_system: queue.Queue = main_app.app.queue_system
    traces = []
    while not queue_system.empty():
        obj = queue_system.get_nowait()
        traces.append(obj)
    if len(traces) > 0:
        await write_traces_batch(traces)


def get_all(tenant_id, data: schemas_ee.TrailSearchPayloadSchema):
    with pg_client.PostgresClient() as cur:
        conditions = ["traces.tenant_id=%(tenant_id)s",
                      "traces.created_at>=%(startDate)s",
                      "traces.created_at<=%(endDate)s"]
        params = {"tenant_id": tenant_id,
                  "startDate": data.startDate,
                  "endDate": data.endDate,
                  "p_start": (data.page - 1) * data.limit,
                  "p_end": data.page * data.limit,
                  **data.dict()}
        if data.user_id is not None:
            conditions.append("user_id=%(user_id)s")
        if data.action is not None:
            conditions.append("action=%(action)s")
        if data.query is not None and len(data.query) > 0:
            conditions.append("users.name ILIKE %(query)s")
            conditions.append("users.tenant_id = %(tenant_id)s")
            params["query"] = helper.values_for_operator(value=data.query,
                                                         op=schemas.SearchEventOperator._contains)
        cur.execute(
            cur.mogrify(
                f"""SELECT COUNT(*) AS count,
                           COALESCE(JSONB_AGG(full_traces ORDER BY rn) 
                                    FILTER (WHERE rn > %(p_start)s AND rn <= %(p_end)s), '[]'::JSONB) AS sessions
                    FROM (SELECT traces.*,users.email,users.name AS username, 
                                ROW_NUMBER() OVER (ORDER BY traces.created_at {data.order}) AS rn 
                            FROM traces LEFT JOIN users USING (user_id)
                            WHERE {" AND ".join(conditions)}
                            ORDER BY traces.created_at {data.order}) AS full_traces;""", params)
        )
        rows = cur.fetchone()
    return helper.dict_to_camel_case(rows)


def get_available_actions(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(
            f"""SELECT DISTINCT action
                FROM traces 
                WHERE tenant_id=%(tenant_id)s
                ORDER BY 1""",
            {"tenant_id": tenant_id}))
        rows = cur.fetchall()
    return [r["action"] for r in rows]


cron_jobs = [
    {"func": process_traces_queue, "trigger": "interval", "seconds": config("TRACE_PERIOD", cast=int, default=60),
     "misfire_grace_time": 20}
]
