import sentry_sdk
from chalice import Chalice, Response
from sentry_sdk import configure_scope

from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic,saml
from routers.app import v1_api
from routers.crons import core_crons
from routers.crons import core_dynamic_crons
from routers.subs import dashboard

    def flush(self):
        pass


def tb_print_exception(etype, value, tb, limit=None, file=None, chain=True):
    if OR_SESSION_TOKEN is not None and not helper.is_local():
        value = type(value)(f"[or_session_token={OR_SESSION_TOKEN}] " + str(value))

    old_tb(etype, value, tb, limit, file, chain)


if helper.is_production():
    traceback.print_exception = tb_print_exception

sys.stdout = F()
sys.stderr = F()
# ---End Monkey-patch


_overrides.chalice_app(app)


@app.middleware('http')
def or_middleware(event, get_response):
    from chalicelib.core import unlock
    if not unlock.is_valid():
        return Response(body={"errors": ["expired license"]}, status_code=403)
    if "{projectid}" in event.path.lower():
        from chalicelib.core import projects
        if event.context["authorizer"].get("authorizer_identity") == "api_key" \
                and not projects.is_authorized(
            project_id=projects.get_internal_project_id(event.uri_params["projectId"]),
            tenant_id=event.context["authorizer"]["tenantId"]) \
                or event.context["authorizer"].get("authorizer_identity", "jwt") == "jwt" \
                and not projects.is_authorized(project_id=event.uri_params["projectId"],
                                               tenant_id=event.context["authorizer"]["tenantId"]):
            print("unauthorized project")
            pg_client.close()
            return Response(body={"errors": ["unauthorized project"]}, status_code=401)
    global OR_SESSION_TOKEN
    OR_SESSION_TOKEN = app.current_request.headers.get('vnd.openreplay.com.sid',
                                                       app.current_request.headers.get('vnd.asayer.io.sid'))
    if "authorizer" in event.context and event.context["authorizer"] is None:
        print("Deleted user!!")
        pg_client.close()
        return Response(body={"errors": ["Deleted user"]}, status_code=403)

    try:
        if helper.TRACK_TIME:
            import time
            now = int(time.time() * 1000)
        response = get_response(event)
        if response.status_code == 200 and response.body is not None and response.body.get("errors") is not None:
            if "not found" in response.body["errors"][0]:
                response = Response(status_code=404, body=response.body)
            else:
                response = Response(status_code=400, body=response.body)
        if response.status_code // 100 == 5 and helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
            with configure_scope() as scope:
                scope.set_tag('stage', environ["stage"])
                scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
                scope.set_extra("context", event.context)
            sentry_sdk.capture_exception(Exception(response.body))
        if helper.TRACK_TIME:
            print(f"Execution time: {int(time.time() * 1000) - now} ms")
    except Exception as e:
        if helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
            with configure_scope() as scope:
                scope.set_tag('stage', environ["stage"])
                scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
                scope.set_extra("context", event.context)
            sentry_sdk.capture_exception(e)
        response = Response(body={"Code": "InternalServerError",
                                  "Message": "An internal server error occurred [level=Fatal]."},
                            status_code=500)
    pg_client.close()
    return response


origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(core.public_app)
app.include_router(core.app)
app.include_router(core.app_apikey)
app.include_router(core_dynamic.public_app)
app.include_router(core_dynamic.app)
app.include_router(core_dynamic.app_apikey)
app.include_router(saml.public_app)
app.include_router(saml.app)
app.include_router(saml.app_apikey)
app.include_router(dashboard.app)
# app.include_router(insights.app)
app.include_router(v1_api.app_apikey)

Schedule = AsyncIOScheduler()
Schedule.start()

for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs:
    Schedule.add_job(id=job["func"].__name__, **job)

# for job in Schedule.get_jobs():
#     print({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})
