from collections import namedtuple
from contextvars import ContextVar


Application = namedtuple(
    "Application",
    (
        "database",
    ),
)
application: Application = ContextVar("application", default=None)
