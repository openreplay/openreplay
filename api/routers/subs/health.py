from chalicelib.core import health, tenants
from routers.base import get_routers

public_app, app, app_apikey = get_routers()

health_router = public_app

if tenants.tenants_exists(use_pool=False):
    health_router = app


@health_router.get('/health', tags=["health-check"])
def get_global_health_status():
    return {"data": health.get_health()}
