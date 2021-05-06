from chalice import Blueprint, Cron
from chalicelib import _overrides

app = Blueprint(__name__)
_overrides.chalice_app(app)

from chalicelib.core import telemetry


# Run every day.
@app.schedule(Cron('0', '0', '?', '*', '*', '*'))
def telemetry_cron(event):
    telemetry.compute()
