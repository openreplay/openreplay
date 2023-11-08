import logging
from contextlib

import psycopg
from decouple import config

import orpy

logger = logging.getLogger(__name__)



def configuration():
    PG_CONFIG = {
        "host": config("pg_host"),
        "database": config("pg_dbname"),
        "user": config("pg_user"),
        "password": config("pg_password"),
        "port": config("pg_port", cast=int),
        "application_name": config("APP_NAME", default="PY")
    }

    if config("PG_TIMEOUT", cast=int, default=0) > 0:
        PG_TIMEOUT = config('PG_TIMEOUT', cast=int) * 1000
        PG_CONFIG["options"] = f"-c statement_timeout={PG_TIMEOUT}"

    return PG_CONFIG


@asynccontextmanager
async def PostgresClient(*args, **kwargs):
    if len(args) or len(kwargs):
        logger.warning("Unhandled arguments")
    async with orpy.orpy.get().pgsql.connection() as cnx:
        yield cnx
