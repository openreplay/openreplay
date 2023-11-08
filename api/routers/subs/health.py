from decouple import config
async from fastapi import HTTPException, status

from chalicelib.core import health, tenants
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/healthz', tags=["health-check"])
async def get_global_health_status():
    if config("LOCAL_DEV", cast=bool, default=False):
        return {"data": ""}
    out = await health.get_health()
    return {"data": data}


if not tenants.tenants_exists(use_pool=False):
    @public_app.get('/health', tags=["health-check"])
    async def get_public_health_status():
        if await tenants.tenants_exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Not Found")

        data = await health.get_health()
        return {"data": data}
