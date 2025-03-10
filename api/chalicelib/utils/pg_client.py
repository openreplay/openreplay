import logging
import time
import asyncio
from threading import Semaphore
from typing import Dict, Any, Optional

import psycopg2
import psycopg2.extras
from decouple import config
from psycopg2 import pool

logger = logging.getLogger(__name__)

_PG_CONFIG = {"host": config("pg_host"),
              "database": config("pg_dbname"),
              "user": config("pg_user"),
              "password": config("pg_password"),
              "port": config("pg_port", cast=int),
              "application_name": config("APP_NAME", default="PY")}
PG_CONFIG = dict(_PG_CONFIG)
if config("PG_TIMEOUT", cast=int, default=0) > 0:
    PG_CONFIG["options"] = f"-c statement_timeout={config('PG_TIMEOUT', cast=int) * 1000}"


class ORThreadedConnectionPool(psycopg2.pool.ThreadedConnectionPool):
    def __init__(self, minconn, maxconn, *args, **kwargs):
        self._semaphore = Semaphore(maxconn)
        super().__init__(minconn, maxconn, *args, **kwargs)

    def getconn(self, *args, **kwargs):
        self._semaphore.acquire()
        try:
            return super().getconn(*args, **kwargs)
        except psycopg2.pool.PoolError as e:
            if str(e) == "connection pool is closed":
                make_pool()
            raise e

    def putconn(self, *args, **kwargs):
        try:
            super().putconn(*args, **kwargs)
            self._semaphore.release()
        except psycopg2.pool.PoolError as e:
            if str(e) == "trying to put unkeyed connection":
                logger.warning("!!! trying to put unkeyed connection")
                logger.warning(f"env-PG_POOL:{config('PG_POOL', default=None)}")
                return
            raise e


postgreSQL_pool: ORThreadedConnectionPool = None

RETRY_MAX = config("PG_RETRY_MAX", cast=int, default=50)
RETRY_INTERVAL = config("PG_RETRY_INTERVAL", cast=int, default=2)
RETRY = 0


def make_pool():
    if not config('PG_POOL', cast=bool, default=True):
        return
    global postgreSQL_pool
    global RETRY
    if postgreSQL_pool is not None:
        try:
            postgreSQL_pool.closeall()
        except (Exception, psycopg2.DatabaseError) as error:
            logger.error("Error while closing all connexions to PostgreSQL", exc_info=error)
    try:
        postgreSQL_pool = ORThreadedConnectionPool(config("PG_MINCONN", cast=int, default=4),
                                                   config("PG_MAXCONN", cast=int, default=8),
                                                   **PG_CONFIG)
        if postgreSQL_pool is not None:
            logger.info("Connection pool created successfully")
    except (Exception, psycopg2.DatabaseError) as error:
        logger.error("Error while connecting to PostgreSQL", exc_info=error)
        if RETRY < RETRY_MAX:
            RETRY += 1
            logger.info(f"Waiting for {RETRY_INTERVAL}s before retry n°{RETRY}")
            time.sleep(RETRY_INTERVAL)
            make_pool()
        else:
            raise error


class PostgresClient:
    connection = None
    cursor = None
    long_query = False
    unlimited_query = False

    def __init__(self, long_query=False, unlimited_query=False, use_pool=True):
        self.long_query = long_query
        self.unlimited_query = unlimited_query
        self.use_pool = use_pool
        if unlimited_query:
            long_config = dict(_PG_CONFIG)
            long_config["application_name"] += "-UNLIMITED"
            self.connection = psycopg2.connect(**long_config)
        elif long_query:
            long_config = dict(_PG_CONFIG)
            long_config["application_name"] += "-LONG"
            if config('PG_TIMEOUT_LONG', cast=int, default=1) > 0:
                long_config["options"] = f"-c statement_timeout=" \
                                         f"{config('PG_TIMEOUT_LONG', cast=int, default=5 * 60) * 1000}"
            else:
                logger.info("Disabled timeout for long query")
            self.connection = psycopg2.connect(**long_config)
        elif not use_pool or not config('PG_POOL', cast=bool, default=True):
            single_config = dict(_PG_CONFIG)
            single_config["application_name"] += "-NOPOOL"
            if config('PG_TIMEOUT', cast=int, default=1) > 0:
                single_config["options"] = f"-c statement_timeout={config('PG_TIMEOUT', cast=int, default=30) * 1000}"
            self.connection = psycopg2.connect(**single_config)
        else:
            self.connection = postgreSQL_pool.getconn()

    def __enter__(self):
        if self.cursor is None:
            self.cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            self.cursor.cursor_execute = self.cursor.execute
            self.cursor.execute = self.__execute
            self.cursor.recreate = self.recreate_cursor
        return self.cursor

    def __exit__(self, *args):
        try:
            self.connection.commit()
            self.cursor.close()
            if not self.use_pool or self.long_query or self.unlimited_query:
                self.connection.close()
        except Exception as error:
            logger.error("Error while committing/closing PG-connection", exc_info=error)
            if str(error) == "connection already closed" \
                    and self.use_pool \
                    and not self.long_query \
                    and not self.unlimited_query \
                    and config('PG_POOL', cast=bool, default=True):
                logger.info("Recreating the connexion pool")
                make_pool()
            else:
                raise error
        finally:
            if config('PG_POOL', cast=bool, default=True) \
                    and self.use_pool \
                    and not self.long_query \
                    and not self.unlimited_query:
                postgreSQL_pool.putconn(self.connection)

    def __execute(self, query, vars=None):
        try:
            result = self.cursor.cursor_execute(query=query, vars=vars)
        except psycopg2.Error as error:
            logger.error(f"!!! Error of type:{type(error)} while executing query:")
            logger.error(query)
            logger.info("starting rollback to allow future execution")
            try:
                self.connection.rollback()
            except psycopg2.InterfaceError as e:
                logger.error("!!! Error while rollbacking connection", exc_info=e)
                logger.error("!!! Trying to recreate the cursor")
                self.recreate_cursor()
            raise error
        return result

    def recreate_cursor(self, rollback=False):
        if rollback:
            try:
                self.connection.rollback()
            except Exception as error:
                logger.error("Error while rollbacking connection for recreation", exc_info=error)
        try:
            self.cursor.close()
        except Exception as error:
            logger.error("Error while closing cursor for recreation", exc_info=error)
        self.cursor = None
        return self.__enter__()

    async def health_check(self) -> Dict[str, Any]:
        """
        Instance method to check DB connection health
        """
        try:
            start_time = asyncio.get_event_loop().time()

            # Run the query in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()

            def check_db():
                cursor = self.connection.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                return True

            await loop.run_in_executor(None, check_db)

            end_time = asyncio.get_event_loop().time()
            ping_time_ms = (end_time - start_time) * 1000

            return {
                "status": "ok",
                "message": "PostgreSQL connection is healthy",
                "ping_time_ms": round(ping_time_ms, 2)
            }
        except Exception as e:
            logger.error(f"PostgreSQL health check failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to connect to PostgreSQL: {str(e)}"
            }

    @classmethod
    async def health_check(cls) -> Dict[str, Any]:
        """
        Class method to check if PostgreSQL connection works.
        Can be called directly on the class: await PostgresClient.health_check()
        """
        try:
            # Create a temporary client for the health check
            client = cls()

            start_time = asyncio.get_event_loop().time()

            # Run the query in a thread pool
            loop = asyncio.get_event_loop()

            def check_db():
                cursor = client.connection.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                return True

            await loop.run_in_executor(None, check_db)

            end_time = asyncio.get_event_loop().time()
            ping_time_ms = (end_time - start_time) * 1000

            # Properly clean up the connection
            if not client.use_pool or client.long_query or client.unlimited_query:
                client.connection.close()
            else:
                postgreSQL_pool.putconn(client.connection)

            return {
                "status": "ok",
                "message": "PostgreSQL connection is healthy",
                "ping_time_ms": round(ping_time_ms, 2)
            }
        except Exception as e:
            logger.error(f"PostgreSQL health check failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to connect to PostgreSQL: {str(e)}"
            }


# Add get_client function at module level
def get_client(long_query=False, unlimited_query=False, use_pool=True) -> PostgresClient:
    """
    Get a PostgreSQL client instance.

    Args:
        long_query: Set True for queries with extended timeout
        unlimited_query: Set True for queries with no timeout
        use_pool: Whether to use the connection pool

    Returns:
        PostgresClient instance
    """
    return PostgresClient(long_query=long_query, unlimited_query=unlimited_query, use_pool=use_pool)


async def init():
    logger.info(f">use PG_POOL:{config('PG_POOL', default=True)}")
    if config('PG_POOL', cast=bool, default=True):
        make_pool()

    # Do a health check at initialization
    try:
        health_status = await PostgresClient.health_check()
        if health_status["status"] == "ok":
            logger.info(f"PostgreSQL connection verified. Ping: {health_status.get('ping_time_ms', 'N/A')}ms")
        else:
            logger.warning(f"PostgreSQL connection check failed: {health_status['message']}")
    except Exception as e:
        logger.error(f"Error during initialization health check: {str(e)}")


async def terminate():
    global postgreSQL_pool
    if postgreSQL_pool is not None:
        try:
            postgreSQL_pool.closeall()
            logger.info("Closed all connexions to PostgreSQL")
        except (Exception, psycopg2.DatabaseError) as error:
            logger.error("Error while closing all connexions to PostgreSQL", exc_info=error)


async def health_check() -> Dict[str, Any]:
    """
    Public health check function that can be used by the application.

    Returns:
        Health status dict
    """
    return await PostgresClient.health_check()
