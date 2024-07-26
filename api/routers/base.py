from fastapi import APIRouter, Depends

from auth.auth_apikey import APIKeyAuth
from auth.auth_jwt import JWTAuth
from auth.auth_project import ProjectAuthorizer
from or_dependencies import ORRoute


def get_routers(prefix="", extra_dependencies=[], tags=[]) -> (APIRouter, APIRouter, APIRouter):
    public_app = APIRouter(route_class=ORRoute, prefix=prefix, tags=tags)
    app = APIRouter(dependencies=[Depends(JWTAuth()), Depends(ProjectAuthorizer("projectId"))] + extra_dependencies,
                    route_class=ORRoute, prefix=prefix, tags=tags)
    app_apikey = APIRouter(
        dependencies=[Depends(APIKeyAuth()), Depends(ProjectAuthorizer("projectKey"))] + extra_dependencies,
        route_class=ORRoute, prefix=prefix, tags=tags)
    return public_app, app, app_apikey
