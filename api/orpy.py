from collections import namedtuple
from contextvars import ContextVar
from typing import Optional

Application = namedtuple(
    "Application",
    (
        "database",
    ),
)
application: ContextVar[Optional[Application]] = ContextVar("application", default=None)
