import sentry_sdk
from chalice import Chalice, Response
from sentry_sdk import configure_scope

from chalicelib import _overrides
from chalicelib.blueprints import bp_authorizers
from chalicelib.blueprints import bp_core, bp_core_crons
from chalicelib.blueprints import bp_core_dynamic, bp_core_dynamic_crons
from chalicelib.blueprints.subs import bp_dashboard
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.helper import environ

from chalicelib.blueprints import bp_ee, bp_ee_crons

app = Chalice(app_name='parrot')
app.debug = not helper.is_production() or helper.is_local()

sentry_sdk.init(environ["sentryURL"])

# Monkey-patch print for DataDog hack
import sys
import traceback

old_tb = traceback.print_exception
old_f = sys.stdout
old_e = sys.stderr
OR_SESSION_TOKEN = None


class F:
    def write(self, x):
        if OR_SESSION_TOKEN is not None and x != '\n' and not helper.is_local():
            old_f.write(f"[or_session_token={OR_SESSION_TOKEN}] {x}")
        else:
            old_f.write(x)

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
    from chalicelib.ee import unlock
    if not unlock.is_valid():
        return Response(body={"errors": ["expired license"]}, status_code=403)
    if "{projectid}" in event.path.lower():
        from chalicelib.ee import projects
        if not projects.is_authorized(project_id=event.uri_params["projectId"],
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
        if response.status_code == 500 and helper.allow_sentry() and OR_SESSION_TOKEN is not None and not helper.is_local():
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


# Open source
app.register_blueprint(bp_authorizers.app)
app.register_blueprint(bp_core.app)
app.register_blueprint(bp_core_crons.app)
app.register_blueprint(bp_core_dynamic.app)
app.register_blueprint(bp_core_dynamic_crons.app)
app.register_blueprint(bp_dashboard.app)

# Enterprise
app.register_blueprint(bp_ee.app)
app.register_blueprint(bp_ee_crons.app)
