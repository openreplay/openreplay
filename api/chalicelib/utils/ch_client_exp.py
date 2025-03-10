import logging
import threading
import time
import asyncio
from functools import wraps
from queue import Queue, Empty
from typing import Dict, Any, Optional

import clickhouse_connect
from clickhouse_connect.driver.query import QueryContext
from decouple import config

logger = logging.getLogger(__name__)

_CH_CONFIG = {"host": config("ch_host"),
              "user": config("ch_user", default="default"),
              "password": config("ch_password", default=""),
              "port": config("ch_port_http", cast=int),
              "client_name": config("APP_NAME", default="PY")}
CH_CONFIG = dict(_CH_CONFIG)

settings = {}
if config('ch_timeout', cast=int, default=-1) > 0:
    logging.info(f"CH-max_execution_time set to {config('ch_timeout')}s")
    settings = {**settings, "max_execution_time": config('ch_timeout', cast=int)}

if config('ch_receive_timeout', cast=int, default=-1) > 0:
    logging.info(f"CH-receive_timeout set to {config('ch_receive_timeout')}s")
    settings = {**settings, "receive_timeout": config('ch_receive_timeout', cast=int)}

extra_args = {}
if config("CH_COMPRESSION", cast=bool, default=True):
    extra_args["compression"] = "lz4"


def transform_result(self, original_function):
    @wraps(original_function)
    def wrapper(*args, **kwargs):
        logger.debug(str.encode(self.format(query=kwargs.get("query", ""), parameters=kwargs.get("parameters"))))
        result = original_function(*args, **kwargs)
        if isinstance(result, clickhouse_connect.driver.query.QueryResult):
            column_names = result.column_names
            result = result.result_rows
            result = [dict(zip(column_names, row)) for row in result]

        return result

    return wrapper


class ClickHouseConnectionPool:
    def __init__(self, min_size, max_size):
        self.min_size = min_size
        self.max_size = max_size
        self.pool = Queue()
        self.lock = threading.Lock()
        self.total_connections = 0

        # Initialize the pool with min_size connections
        for _ in range(self.min_size):
            client = clickhouse_connect.get_client(**CH_CONFIG,
                                                   database=config("ch_database", default="default"),
                                                   settings=settings,
                                                   **extra_args)
            self.pool.put(client)
            self.total_connections += 1

    def get_connection(self):
        try:
            # Try to get a connection without blocking
            client = self.pool.get_nowait()
            return client
        except Empty:
            with self.lock:
                if self.total_connections < self.max_size:
                    client = clickhouse_connect.get_client(**CH_CONFIG,
                                                           database=config("ch_database", default="default"),
                                                           settings=settings,
                                                           **extra_args)
                    self.total_connections += 1
                    return client
        # If max_size reached, wait until a connection is available
        client = self.pool.get()
        return client

    def release_connection(self, client):
        self.pool.put(client)

    def close_all(self):
        with self.lock:
            while not self.pool.empty():
                client = self.pool.get()
                client.close()
            self.total_connections = 0


CH_pool: ClickHouseConnectionPool = None

RETRY_MAX = config("CH_RETRY_MAX", cast=int, default=50)
RETRY_INTERVAL = config("CH_RETRY_INTERVAL", cast=int, default=2)
RETRY = 0


def make_pool():
    if not config('CH_POOL', cast=bool, default=True):
        return
    global CH_pool
    global RETRY
    if CH_pool is not None:
        try:
            CH_pool.close_all()
        except Exception as error:
            logger.error("Error while closing all connexions to CH", exc_info=error)
    try:
        CH_pool = ClickHouseConnectionPool(min_size=config("CH_MINCONN", cast=int, default=4),
                                           max_size=config("CH_MAXCONN", cast=int, default=8))
        if CH_pool is not None:
            logger.info("Connection pool created successfully for CH")
    except ConnectionError as error:
        logger.error("Error while connecting to CH", exc_info=error)
        if RETRY < RETRY_MAX:
            RETRY += 1
            logger.info(f"waiting for {RETRY_INTERVAL}s before retry n°{RETRY}")
            time.sleep(RETRY_INTERVAL)
            make_pool()
        else:
            raise error


class ClickHouseClient:
    __client = None

    def __init__(self, database=None):
        if self.__client is None:
            if database is not None or not config('CH_POOL', cast=bool, default=True):
                self.__client = clickhouse_connect.get_client(**CH_CONFIG,
                                                              database=database if database else config("ch_database",
                                                                                                        default="default"),
                                                              settings=settings,
                                                              **extra_args)

            else:
                self.__client = CH_pool.get_connection()

            self.__client.execute = transform_result(self, self.__client.query)
            self.__client.format = self.format

    def __enter__(self):
        return self.__client

    def format(self, query, *, parameters=None):
        if parameters is None:
            return query
        return query % {
            key: f"'{value}'" if isinstance(value, str) else value
            for key, value in parameters.items()
        }

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if the connection to ClickHouse is working.

        Returns:
            Dict with status information:
            {
                "status": "ok" | "error",
                "message": str,
                "ping_time_ms": float (if available)
            }
        """
        try:
            start_time = asyncio.get_event_loop().time()

            # Run the query in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: self.__client.query("SELECT 1"))

            end_time = asyncio.get_event_loop().time()
            ping_time_ms = (end_time - start_time) * 1000

            return {
                "status": "ok",
                "message": "ClickHouse connection is healthy",
                "ping_time_ms": round(ping_time_ms, 2)
            }
        except Exception as e:
            logger.error(f"ClickHouse health check failed: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to connect to ClickHouse: {str(e)}",
            }

    @classmethod
    async def health_check(cls) -> Dict[str, Any]:
        """
        Class method to check if the ClickHouse connection is working.
        Can be called directly on the class: await ClickHouseClient.health_check()

        Returns:
            Dict with status information
        """
        client = get_client()
        try:
            start_time = asyncio.get_event_loop().time()

            # Run the query in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            client_instance = client.__client
            await loop.run_in_executor(None, lambda: client_instance.query("SELECT 1"))

            end_time = asyncio.get_event_loop().time()
            ping_time_ms = (end_time - start_time) * 1000

            return {
                "status": "ok",
                "message": "ClickHouse connection is healthy",
                "ping_time_ms": round(ping_time_ms, 2)
            }
        except Exception as e:
            logger.error(f"ClickHouse health check failed: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to connect to ClickHouse: {str(e)}",
            }

    def __exit__(self, *args):
        if config('CH_POOL', cast=bool, default=True):
            CH_pool.release_connection(self.__client)
        else:
            self.__client.close()


# Add the get_client function at module level
def get_client(database=None) -> ClickHouseClient:
    """
    Get a ClickHouse client instance.

    Args:
        database: Optional database name to override the default

    Returns:
        ClickHouseClient instance
    """
    return ClickHouseClient(database=database)


async def init():
    logger.info(f">use CH_POOL:{config('CH_POOL', default=True)}")
    if config('CH_POOL', cast=bool, default=True):
        make_pool()

    # Do a health check at initialization to verify connection
    try:
        health_status = await ClickHouseClient.health_check()
        if health_status["status"] == "ok":
            logger.info(f"ClickHouse connection verified. Ping: {health_status.get('ping_time_ms', 'N/A')}ms")
        else:
            logger.warning(f"ClickHouse connection check failed: {health_status['message']}")
    except Exception as e:
        logger.error(f"Error during initialization health check: {str(e)}")


async def terminate():
    global CH_pool
    if CH_pool is not None:
        try:
            CH_pool.close_all()
            logger.info("Closed all connexions to CH")
        except Exception as error:
            logger.error("Error while closing all connexions to CH", exc_info=error)


async def health_check() -> Dict[str, Any]:
    """
    Public health check function that can be used by the application.

    Returns:
        Health status dict
    """
    return await ClickHouseClient.health_check()
