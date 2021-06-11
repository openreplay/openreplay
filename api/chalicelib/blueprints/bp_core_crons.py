from chalice import Blueprint
from chalice import Cron
from chalicelib import _overrides
from chalicelib.core import reset_password, weekly_report, jobs

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.schedule(Cron('0', '*', '?', '*', '*', '*'))
def run_scheduled_jobs(event):
    jobs.execute_jobs()


@app.schedule(Cron('0/60', '*', '*', '*', '?', '*'))
def clear_password_reset(event):
    reset_password.cron()


# Run every monday.
@app.schedule(Cron('5', '0', '?', '*', 'MON', '*'))
def weekly_report2(event):
    weekly_report.cron()
