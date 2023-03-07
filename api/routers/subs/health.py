from typing import Union

from fastapi import Body, Depends, Request

import schemas
from chalicelib.core import health
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@public_app.get('/health', tags=["dashboard"])
def get_global_health():
    return {"data": health.get_health()}
