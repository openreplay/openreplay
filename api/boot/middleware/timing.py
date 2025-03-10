import logging
import time
from fastapi import Request
from starlette.responses import StreamingResponse

from boot.config import settings
from chalicelib.utils import helper

logger = logging.getLogger(__name__)


async def timing_middleware(request: Request, call_next):
    """
    Middleware to track request timing and log slow requests.
    Also adds security headers to responses.
    """
    if helper.TRACK_TIME:
        start_time = time.time()

    try:
        response: StreamingResponse = await call_next(request)
    except Exception as e:
        path = request.url.path
        method = request.method
        logger.error(f"{method}: {path} FAILED! Error: {str(e)}")
        raise

    # Log non-successful responses
    if response.status_code // 100 != 2:
        logger.warning(f"{request.method}:{request.url.path} {response.status_code}!")

    # Track execution time
    if helper.TRACK_TIME:
        elapsed = time.time() - start_time
        if elapsed > 2:
            elapsed = round(elapsed, 2)
            logger.warning(f"Execution time: {elapsed} s for {request.method}: {request.url.path}")

    # Set security headers
    response.headers["x-robots-tag"] = 'noindex, nofollow'

    return response
