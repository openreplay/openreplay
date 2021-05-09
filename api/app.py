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

app = Chalice(app_name='parrot')
app.debug = not helper.is_production() or helper.is_local()

sentry_sdk.init(environ["sentryURL"])

# Monkey-patch print for DataDog hack
import sys
import traceback

old_tb = traceback.print_exception
old_f = sys.stdout
old_e = sys.stderr
ASAYER_SESSION_ID = None


class F:
    def write(self, x):
        if ASAYER_SESSION_ID is not None and x != '\n' and not helper.is_local():
            old_f.write(f"[asayer_session_id={ASAYER_SESSION_ID}] {x}")
        else:
            old_f.write(x)

    def flush(self):
        pass


def tb_print_exception(etype, value, tb, limit=None, file=None, chain=True):
    if ASAYER_SESSION_ID is not None and not helper.is_local():
        # bugsnag.notify(Exception(str(value)), meta_data={"special_info": {"asayerSessionId": ASAYER_SESSION_ID}})
        value = type(value)(f"[asayer_session_id={ASAYER_SESSION_ID}] " + str(value))

    old_tb(etype, value, tb, limit, file, chain)


if helper.is_production():
    traceback.print_exception = tb_print_exception

sys.stdout = F()
sys.stderr = F()
# ---End Monkey-patch


_overrides.chalice_app(app)

# v0905
@app.middleware('http')
def asayer_middleware(event, get_response):
    global ASAYER_SESSION_ID
    ASAYER_SESSION_ID = app.current_request.headers.get('vnd.asayer.io.sid')
    if "authorizer" in event.context and event.context["authorizer"] is None:
        print("Deleted user!!")
        pg_client.close()
        return Response(body={"errors": ["Deleted user"]}, status_code=403)

    try:
        if helper.TRACK_TIME:
            import time
            now = int(time.time() * 1000)
        response = get_response(event)
        if helper.TRACK_TIME:
            print(f"Execution time: {int(time.time() * 1000) - now} ms")
    except Exception as e:
        print("middleware exception handling")
        print(e)
        pg_client.close()
        if helper.allow_sentry() and ASAYER_SESSION_ID is not None and not helper.is_local():
            with configure_scope() as scope:
                scope.set_tag('stage', environ["stage"])
                scope.set_tag('openReplaySessionToken', ASAYER_SESSION_ID)
                scope.set_extra("context", event.context)
            sentry_sdk.capture_exception(e)
        raise e
    pg_client.close()
    return response


# Open source
app.register_blueprint(bp_authorizers.app)
app.register_blueprint(bp_core.app)
app.register_blueprint(bp_core_crons.app)
app.register_blueprint(bp_core_dynamic.app)
app.register_blueprint(bp_core_dynamic_crons.app)
app.register_blueprint(bp_dashboard.app)
