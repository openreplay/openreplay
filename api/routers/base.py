from fastapi import APIRouter, Depends

from auth.auth_apikey import APIKeyAuth
from auth.auth_jwt import JWTAuth
from auth.auth_project import ProjectAuthorizer
from or_dependencies import ORRoute


def get_routers(extra_dependencies=[]) -> (APIRouter, APIRouter, APIRouter):
    public_app = APIRouter(route_class=ORRoute)
    app = APIRouter(dependencies=[Depends(JWTAuth()), Depends(ProjectAuthorizer("projectId"))] + extra_dependencies,
                    route_class=ORRoute)
    app_apikey = APIRouter(
        dependencies=[Depends(APIKeyAuth()), Depends(ProjectAuthorizer("projectKey"))] + extra_dependencies,
        route_class=ORRoute)
    return public_app, app, app_apikey
