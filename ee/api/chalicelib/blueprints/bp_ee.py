from chalice import Blueprint

from chalicelib import _overrides

app = Blueprint(__name__)
_overrides.chalice_app(app)
