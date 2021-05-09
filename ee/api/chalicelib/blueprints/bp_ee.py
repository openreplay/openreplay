from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.ee import unlock

app = Blueprint(__name__)
_overrides.chalice_app(app)

unlock.check()
