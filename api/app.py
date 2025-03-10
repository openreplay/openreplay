import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from boot.config import settings
from boot.middleware import timing_middleware, setup_cors
from boot.scheduler.manager import SchedulerManager
from boot.health.router import health_router
from chalicelib.utils import pg_client, ch_client

# Import routers and cron jobs
from crons import core_crons, core_dynamic_crons
from routers import core, core_dynamic
from routers.subs import insights, metrics, v1_api, health, usability_tests, spot, product_anaytics

# Configure logging
settings.configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Handles startup and shutdown tasks:
    - Database connections initialization
    - Scheduler setup
    - Cleanup on shutdown
    """
    # Startup
    logger.info(">>>>> starting up <<<<<")

    # Initialize database connections
    await pg_client.init()
    await ch_client.init()

    # Initialize scheduler with jobs
    all_jobs = core_crons.cron_jobs + core_dynamic_crons.cron_jobs
    SchedulerManager.initialize(all_jobs)

    # Store PostgreSQL pool in app state for backwards compatibility
    # app.state.postgresql = pg_client.

    # App is ready to handle requests
    yield

    # Shutdown
    logger.info(">>>>> shutting down <<<<<")

    # Shutdown scheduler
    SchedulerManager.shutdown()

    # Close database connections
    await pg_client.terminate()
    await ch_client.terminate()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    # Create FastAPI app
    app = FastAPI(
        root_path=settings.ROOT_PATH,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        lifespan=lifespan,
        title=f"{settings.APP_NAME} API",
        description=f"API for {settings.APP_NAME}",
        version="1.0.0"
    )

    # Add middlewares
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.middleware('http')(timing_middleware)
    setup_cors(app)

    # Register health check routes first for monitoring systems
    app.include_router(health_router)

    # Register existing application routers
    register_routers(app)

    return app


def register_routers(app: FastAPI) -> None:
    """Register all application routers."""
    # Core routers
    app.include_router(core.public_app)
    app.include_router(core.app)
    app.include_router(core.app_apikey)

    # Core dynamic routers
    app.include_router(core_dynamic.public_app)
    app.include_router(core_dynamic.app)
    app.include_router(core_dynamic.app_apikey)

    # Feature routers
    app.include_router(metrics.app)
    app.include_router(insights.app)
    app.include_router(v1_api.app_apikey)

    # Health routers (existing ones from the codebase)
    app.include_router(health.public_app)
    app.include_router(health.app)
    app.include_router(health.app_apikey)

    # Usability tests routers
    app.include_router(usability_tests.public_app)
    app.include_router(usability_tests.app)
    app.include_router(usability_tests.app_apikey)

    # Spot routers
    app.include_router(spot.public_app)
    app.include_router(spot.app)
    app.include_router(spot.app_apikey)

    # Product analytics routers
    app.include_router(product_anaytics.public_app)
    app.include_router(product_anaytics.app)
    app.include_router(product_anaytics.app_apikey)


# Create application instance
app = create_app()

# For running with a proper ASGI server like uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
