from chalice import Blueprint, Cron
from chalicelib import _overrides
from chalicelib.utils import helper

app = Blueprint(__name__)
_overrides.chalice_app(app)
from chalicelib.core import telemetry
from chalicelib.core import unlock


# Run every day.
@app.schedule(Cron('0', '0', '?', '*', '*', '*'))
def telemetry_cron(event):
    telemetry.compute()


@app.schedule(Cron('0/60', '*', '*', '*', '?', '*'))
def unlock_cron(event):
    print("validating license")
    unlock.check()
    print(f"valid: {unlock.is_valid()}")
