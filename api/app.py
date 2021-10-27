import sentry_sdk
from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk import configure_scope
from starlette.responses import StreamingResponse

from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic
from routers.app import v1_api
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

app = FastAPI()


@app.middleware('http')
async def or_middleware(request: Request, call_next):
    global OR_SESSION_TOKEN
    OR_SESSION_TOKEN = request.headers.get('vnd.openreplay.com.sid', request.headers.get('vnd.asayer.io.sid'))

    try:
        if helper.TRACK_TIME:
            import time
            now = int(time.time() * 1000)
        response: StreamingResponse = await call_next(request)
        if helper.TRACK_TIME:
            print(f"Execution time: {int(time.time() * 1000) - now} ms")
    except Exception as e:
        if helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
            with configure_scope() as scope:
                scope.set_tag('stage', config["stage"])
                scope.set_tag('openReplaySessionToken', OR_SESSION_TOKEN)
                if hasattr(request.state, "currentContext"):
                    scope.set_extra("context", request.state.currentContext.dict())
            sentry_sdk.capture_exception(e)
        pg_client.close()
        raise e
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
app.include_router(dashboard.app)
app.include_router(insights.app)
app.include_router(v1_api.app_apikey)
