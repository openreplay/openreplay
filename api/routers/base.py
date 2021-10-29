from fastapi import APIRouter, Depends

from auth.auth_apikey import APIKeyAuth
from auth.auth_jwt import JWTAuth
from or_dependencies import ORRoute


def get_routers() -> (APIRouter, APIRouter, APIRouter):
    public_app = APIRouter(route_class=ORRoute)
    app = APIRouter(dependencies=[Depends(JWTAuth())], route_class=ORRoute)
    app_apikey = APIRouter(dependencies=[Depends(APIKeyAuth())], route_class=ORRoute)
    return public_app, app, app_apikey
