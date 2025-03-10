import logging
import time
import psutil
from typing import Dict, Any

from fastapi import APIRouter, status
from pydantic import BaseModel

from boot.scheduler.manager import SchedulerManager
from chalicelib.utils import pg_client, ch_client

logger = logging.getLogger(__name__)

# Create router for health endpoints
health_router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    details: Dict[str, Any]


@health_router.get("/liveness", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def liveness():
    """
    Liveness probe endpoint.

    This endpoint indicates if the application is running.
    It's designed to be quick and does not check external dependencies.
    """
    return HealthResponse(
        status="alive",
        details={
            "uptime_seconds": time.time() - psutil.boot_time(),
            "process": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent
            }
        }
    )


@health_router.get("/readiness", response_model=HealthResponse)
async def readiness():
    """
    Readiness probe endpoint.

    This endpoint indicates if the application is ready to handle requests.
    It checks connections to dependent services.
    """
    # Check PostgreSQL connection
    pg_healthy = await pg_client.PostgresClient.health_check()

    # Check ClickHouse connection
    ch_healthy = await ch_client.ClickHouseClient.health_check()

    # Check scheduler
    scheduler_healthy = SchedulerManager.health_check()

    # Overall status
    all_healthy = pg_healthy and ch_healthy and scheduler_healthy
    status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    response = HealthResponse(
        status="ready" if all_healthy else "not ready",
        details={
            "services": {
                "postgres": "healthy" if pg_healthy else "unhealthy",
                "clickhouse": "healthy" if ch_healthy else "unhealthy",
                "scheduler": "healthy" if scheduler_healthy else "unhealthy"
            },
            "system": {
                "disk_usage_percent": psutil.disk_usage('/').percent,
                "memory_available_mb": psutil.virtual_memory().available / (1024 * 1024),
                "cpu_count": psutil.cpu_count(),
                "cpu_percent": psutil.cpu_percent()
            }
        }
    )

    return response
