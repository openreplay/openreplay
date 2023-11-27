from decouple import config
from fastapi import HTTPException, status

from chalicelib.core import health, tenants
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/healthz', tags=["health-check"])
def get_global_health_status():
    if config("LOCAL_DEV", cast=bool, default=False):
        return {"data": ""}
    return {"data": health.get_health()}


if not tenants.tenants_exists_sync(use_pool=False):
    @public_app.get('/health', tags=["health-check"])
    async def get_public_health_status():
        if await tenants.tenants_exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Not Found")

        return {"data": health.get_health()}
