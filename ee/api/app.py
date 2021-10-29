# import sentry_sdk
# from chalice import Chalice, Response
# from sentry_sdk import configure_scope
#
# from chalicelib import _overrides
# from chalicelib.blueprints import bp_authorizers
# from chalicelib.blueprints import bp_core, bp_core_crons
# from chalicelib.blueprints.app import v1_api
# from chalicelib.blueprints import bp_core_dynamic, bp_core_dynamic_crons
# from chalicelib.blueprints.subs import bp_dashboard,bp_insights
# from chalicelib.utils import helper
# from chalicelib.utils import pg_client
# from chalicelib.utils.helper import environ
#
# from chalicelib.blueprints import bp_ee, bp_ee_crons, bp_saml
#
# app = Chalice(app_name='parrot')
# app.debug = not helper.is_production() or helper.is_local()
#
# sentry_sdk.init(environ["sentryURL"])
#
# # Monkey-patch print for DataDog hack
# import sys
# import traceback
#
# old_tb = traceback.print_exception
# old_f = sys.stdout
# old_e = sys.stderr
# OR_SESSION_TOKEN = None
#
#
# class F:
#     def write(self, x):
#         if OR_SESSION_TOKEN is not None and x != '\n' and not helper.is_local():
#             old_f.write(f"[or_session_token={OR_SESSION_TOKEN}] {x}")
#         else:
#             old_f.write(x)
#
#     def flush(self):
#         pass
#
#
# def tb_print_exception(etype, value, tb, limit=None, file=None, chain=True):
#     if OR_SESSION_TOKEN is not None and not helper.is_local():
#         value = type(value)(f"[or_session_token={OR_SESSION_TOKEN}] " + str(value))
#
#     old_tb(etype, value, tb, limit, file, chain)
#
#
# if helper.is_production():
#     traceback.print_exception = tb_print_exception
#
# sys.stdout = F()
# sys.stderr = F()
# # ---End Monkey-patch
#
#
# _overrides.chalice_app(app)
#
#
# @app.middleware('http')
# def or_middleware(event, get_response):
#     from chalicelib.core import unlock
#     if not unlock.is_valid():
#         return Response(body={"errors": ["expired license"]}, status_code=403)
#     if "{projectid}" in event.path.lower():
#         from chalicelib.core import projects
#         if event.context["authorizer"].get("authorizer_identity") == "api_key" \
#                 and not projects.is_authorized(
#             project_id=projects.get_internal_project_id(event.uri_params["projectId"]),
#             tenant_id=event.context["authorizer"]["tenantId"]) \
#                 or event.context["authorizer"].get("authorizer_identity", "jwt") == "jwt" \
#                 and not projects.is_authorized(project_id=event.uri_params["projectId"],
#                                                tenant_id=event.context["authorizer"]["tenantId"]):
#             print("unauthorized project")
#             pg_client.close()
#             return Response(body={"errors": ["unauthorized project"]}, status_code=401)
#     global OR_SESSION_TOKEN
#     OR_SESSION_TOKEN = app.current_request.headers.get('vnd.openreplay.com.sid',
#                                                        app.current_request.headers.get('vnd.asayer.io.sid'))
#     if "authorizer" in event.context and event.context["authorizer"] is None:
#         print("Deleted user!!")
#         pg_client.close()
#         return Response(body={"errors": ["Deleted user"]}, status_code=403)
#
#     try:
#         if helper.TRACK_TIME:
#             import time
#             now = int(time.time() * 1000)
#         response = get_response(event)
#         if response.status_code == 200 and response.body is not None and response.body.get("errors") is not None:
#             if "not found" in response.body["errors"][0]:
#                 response = Response(status_code=404, body=response.body)
#             else:
#                 response = Response(status_code=400, body=response.body)
#         if response.status_code // 100 == 5 and helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
#             with configure_scope() as scope:
#                 scope.set_tag('stage', environ["stage"])
#                 scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
#                 scope.set_extra("context", event.context)
#             sentry_sdk.capture_exception(Exception(response.body))
#         if helper.TRACK_TIME:
#             print(f"Execution time: {int(time.time() * 1000) - now} ms")
#     except Exception as e:
#         if helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
#             with configure_scope() as scope:
#                 scope.set_tag('stage', environ["stage"])
#                 scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
#                 scope.set_extra("context", event.context)
#             sentry_sdk.capture_exception(e)
#         response = Response(body={"Code": "InternalServerError",
#                                   "Message": "An internal server error occurred [level=Fatal]."},
#                             status_code=500)
#     pg_client.close()
#     return response
#
#
# # Open source
# app.register_blueprint(bp_authorizers.app)
# app.register_blueprint(bp_core.app)
# app.register_blueprint(bp_core_crons.app)
# app.register_blueprint(bp_core_dynamic.app)
# app.register_blueprint(bp_core_dynamic_crons.app)
# app.register_blueprint(bp_dashboard.app)
# app.register_blueprint(bp_insights.app)
# app.register_blueprint(v1_api.app)
# # Enterprise
# app.register_blueprint(bp_ee.app)
# app.register_blueprint(bp_ee_crons.app)
# app.register_blueprint(bp_saml.app)
import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk import configure_scope
from starlette.responses import StreamingResponse

from auth.auth_project import ProjectAuthorizer
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic
from routers.app import v1_api
from routers.crons import core_crons
from routers.crons import core_dynamic_crons
from routers.subs import dashboard, insights

# # Monkey-patch print for DataDog hack
# import sys
# import traceback
#
# old_tb = traceback.print_exception
# old_f = sys.stdout
# old_e = sys.stderr
# OR_SESSION_TOKEN = None
#
#
# class F:
#     def write(self, x):
#         if OR_SESSION_TOKEN is not None and x != '\n' and not helper.is_local():
#             old_f.write(f"[or_session_token={OR_SESSION_TOKEN}] {x}")
#         else:
#             old_f.write(x)
#
#     def flush(self):
#         pass
#
#
# def tb_print_exception(etype, value, tb, limit=None, file=None, chain=True):
#     if OR_SESSION_TOKEN is not None and not helper.is_local():
#         value = type(value)(f"[or_session_token={OR_SESSION_TOKEN}] " + str(value))
#
#     old_tb(etype, value, tb, limit, file, chain)
#
#
# if helper.is_production():
#     traceback.print_exception = tb_print_exception
#
# sys.stdout = F()
# sys.stderr = F()
# # ---End Monkey-patch

# app = FastAPI(dependencies=[Depends(ProjectAuthorizer())])
app = FastAPI()
# print(app.dependency_overrides)
#
#
# @app.middleware('http')
# async def or_middleware(request: Request, call_next):
#     global OR_SESSION_TOKEN
#     OR_SESSION_TOKEN = request.headers.get('vnd.openreplay.com.sid', request.headers.get('vnd.asayer.io.sid'))
#
#     try:
#         if helper.TRACK_TIME:
#             import time
#             now = int(time.time() * 1000)
#         response: StreamingResponse = await call_next(request)
#         if helper.TRACK_TIME:
#             print(f"Execution time: {int(time.time() * 1000) - now} ms")
#     except Exception as e:
#         if helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
#             with configure_scope() as scope:
#                 scope.set_tag('stage', config["stage"])
#                 scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
#                 if hasattr(request.state, "currentContext"):
#                     scope.set_extra("context", request.state.currentContext.dict())
#             sentry_sdk.capture_exception(e)
#         pg_client.close()
#         raise e
#     pg_client.close()
#     return response


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
app.include_router(dashboard.app)
app.include_router(insights.app)
app.include_router(v1_api.app_apikey)

Schedule = AsyncIOScheduler()
Schedule.start()

for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs:
    Schedule.add_job(id=job["func"].__name__, **job)

# for job in Schedule.get_jobs():
#     print({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})
