from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.core import unlock

app = Blueprint(__name__)
_overrides.chalice_app(app)

unlock.check()
