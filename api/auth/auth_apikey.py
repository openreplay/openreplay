import logging
from typing import Optional

from fastapi import Request
from fastapi.security import APIKeyHeader
from starlette import status
from starlette.exceptions import HTTPException

from chalicelib.core import authorizers
from schemas import CurrentAPIContext

logger = logging.getLogger(__name__)


class APIKeyAuth(APIKeyHeader):
    def __init__(self, auto_error: bool = True):
        super(APIKeyAuth, self).__init__(name="Authorization", auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[CurrentAPIContext]:
        api_key: Optional[str] = await super(APIKeyAuth, self).__call__(request)
        r = authorizers.api_key_authorizer(api_key)
        if r is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key",
            )
        r["authorizer_identity"] = "api_key"
        logger.debug(r)
        request.state.authorizer_identity = "api_key"
        request.state.currentContext = CurrentAPIContext(tenantId=r["tenantId"])
        return request.state.currentContext
