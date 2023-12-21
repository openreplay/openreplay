import json
import logging
from typing import Callable

from fastapi import HTTPException, Depends
from fastapi import Security
from fastapi.routing import APIRoute
from fastapi.security import SecurityScopes
from starlette import status
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

import schemas
from chalicelib.core import traces
from chalicelib.utils import helper

logger = logging.getLogger(__name__)


async def OR_context(request: Request) -> schemas.CurrentContext:
    if hasattr(request.state, "currentContext"):
        return request.state.currentContext
    else:
        raise Exception("currentContext not found")


class ORRoute(APIRoute):
    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            logger.debug(f"call processed by: {self.methods} {self.path_format}")
            try:
                response: Response = await original_route_handler(request)
            except HTTPException as e:
                if e.status_code // 100 == 4:
                    return JSONResponse(content={"errors": e.detail if isinstance(e.detail, list) else [e.detail]},
                                        status_code=e.status_code)
                else:
                    raise e

            if isinstance(response, JSONResponse):
                response: JSONResponse = response
                body = json.loads(response.body.decode('utf8'))
                body = helper.cast_session_id_to_string(body)
                response = JSONResponse(content=body, status_code=response.status_code,
                                        headers={k: v for k, v in response.headers.items() if k != "content-length"},
                                        media_type=response.media_type, background=response.background)
                if response.status_code == 200 \
                        and body is not None and isinstance(body, dict) \
                        and body.get("errors") is not None:
                    if "not found" in body["errors"][0]:
                        response.status_code = status.HTTP_404_NOT_FOUND
                    else:
                        response.status_code = status.HTTP_400_BAD_REQUEST
            traces.trace(action=self.name, path_format=self.path_format, request=request, response=response)
            return response

        return custom_route_handler


def __check(security_scopes: SecurityScopes, context: schemas.CurrentContext = Depends(OR_context)):
    s_p = 0
    for scope in security_scopes.scopes:
        if isinstance(scope, schemas.ServicePermissions):
            s_p += 1
        if context.service_account and not isinstance(scope, schemas.ServicePermissions) \
                or not context.service_account and not isinstance(scope, schemas.Permissions):
            continue
        if scope not in context.permissions:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Not enough permissions")
    if context.service_account and s_p == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not enough permissions (service account)")


def OR_scope(*scopes):
    return Security(__check, scopes=list(scopes))


def __check_role(required_roles: SecurityScopes, context: schemas.CurrentContext = Depends(OR_context)):
    if len(required_roles.scopes) > 0:
        if context.role not in required_roles.scopes:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="You need a different role to access this resource")


def OR_role(*required_roles):
    return Security(__check_role, scopes=list(required_roles))
