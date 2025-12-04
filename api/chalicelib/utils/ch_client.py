import logging
import threading
import time
from functools import wraps
from queue import Queue, Empty
from typing import Optional

import clickhouse_connect
from clickhouse_connect.driver.client import Client
from clickhouse_connect.driver.query import QueryContext
from decouple import config

logger = logging.getLogger(__name__)

_CH_CONFIG = {"host": config("ch_host"),
              "user": config("ch_user", default="default"),
              "password": config("ch_password", default=""),
              "port": config("ch_port_http", cast=int),
              "client_name": config("APP_NAME", default="PY"),
              "database": config("ch_database", default="default")}
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

if config("CH_MAX_ROWS_TO_READ", cast=int, default=0) > 0:
    extra_args["query_limit"] = config("CH_MAX_ROWS_TO_READ", cast=int)

if config("CH_QUERY_RETRIES", cast=int, default=0) > 0:
    extra_args["query_retries"] = config("CH_QUERY_RETRIES", cast=int)

USE_POOL = config('CH_POOL', cast=bool, default=True)


def transform_result(self, original_function):
    @wraps(original_function)
    def wrapper(*args, **kwargs):
        if kwargs.get("parameters"):
            if config("LOCAL_DEV", cast=bool, default=False):
                logger.debug(self.format(query=kwargs.get("query", ""), parameters=kwargs.get("parameters")))
            else:
                logger.debug(
                    str.encode(self.format(query=kwargs.get("query", ""), parameters=kwargs.get("parameters"))))
        elif len(args) > 0:
            if config("LOCAL_DEV", cast=bool, default=False):
                logger.debug(args[0])
            else:
                logger.debug(str.encode(args[0]))
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
        self.pool: Queue[Client] = Queue()
        self.lock = threading.Lock()
        self.total_connections = 0

        # Initialize the pool with min_size connections
        for _ in range(self.min_size):
            client = clickhouse_connect.get_client(**CH_CONFIG,
                                                   settings=settings,
                                                   **extra_args)
            self.pool.put(client)
            self.total_connections += 1

    def get_connection(self):
        try:
            # Try to get a connection without blocking
            client = self.pool.get_nowait()
        except Empty as e:
            with self.lock:
                if self.total_connections < self.max_size:
                    # If no connexion in the pool is found, create a new one if max not reached
                    client = clickhouse_connect.get_client(**CH_CONFIG,
                                                           settings=settings,
                                                           **extra_args)
                    self.total_connections += 1
                else:
                    # If max_size reached, wait until a connection is available
                    logger.info("Total connections exceeded, waiting for a new connection in the pool")
                    try:
                        client = self.pool.get(timeout=config("CH_WAIT_FOR_CNX_POOL_S", cast=int, default=10))
                    except Empty as exc:
                        logger.error("Pool wait timeout exceeded, no connections left")
                        raise exc

        return client

    def release_connection(self, client):
        # If the queue is full (should not happen with consistent get/release),
        # close the extra connection to avoid leaks.
        try:
            self.pool.put_nowait(client)
        except Exception:
            try:
                client.close()
            except Exception:
                logger.exception("Error while closing extra ClickHouse client")

    def close_all(self):
        with self.lock:
            while not self.pool.empty():
                client = self.pool.get()
                try:
                    client.close()
                except Exception:
                    logger.exception("Error while closing ClickHouse client")
            self.total_connections = 0
            logger.info("Closed all ClickHouse connections (pool).")


CH_pool: Optional[ClickHouseConnectionPool] = None
_pool_lock = threading.Lock()

RETRY_MAX = config("CH_RETRY_MAX", cast=int, default=20)
RETRY_INTERVAL = config("CH_RETRY_INTERVAL", cast=int, default=2)
RETRY = 0


def make_pool():
    if not USE_POOL:
        return
    global CH_pool
    global RETRY
    with _pool_lock:
        if CH_pool is not None:
            try:
                CH_pool.close_all()
            except Exception as error:
                logger.error("Error while closing all connexions to CH", exc_info=error)

        attempts = 0
        while True:
            attempts += 1
            try:
                CH_pool = ClickHouseConnectionPool(min_size=config("CH_MINCONN", cast=int, default=4),
                                                   max_size=config("CH_MAXCONN", cast=int, default=8))
                logger.info("ClickHouse connection pool created successfully")
                return
            except Exception as error:
                logger.error("Error while creating ClickHouse pool", exc_info=error)
                if attempts >= RETRY_MAX:
                    logger.error("Failed to create ClickHouse pool after %d attempts", attempts)
                    raise
                logger.info(f"waiting for {RETRY_INTERVAL}s before retry n°{RETRY}")
                time.sleep(RETRY_INTERVAL)


class ClickHouseClient:
    _client = None

    def __init__(self):
        if self._client is None:
            if not USE_POOL:
                self._client = clickhouse_connect.get_client(**CH_CONFIG,
                                                             settings=settings,
                                                             **extra_args)

            else:
                self._client = CH_pool.get_connection()

            self._client.execute = transform_result(self, self._client.query)
            self._client.format = self.format

    def __enter__(self):
        return self._client

    @staticmethod
    def format(query, parameters=None):
        if parameters:
            ctx = QueryContext(query=query, parameters=parameters)
            return ctx.final_query
        return query

    def __exit__(self, *args):
        if USE_POOL:
            CH_pool.release_connection(self._client)
        else:
            try:
                self._client.close()
            except Exception:
                logger.exception("Error while closing ClickHouse client")


async def init() -> None:
    logger.info(f">use CH_POOL:{USE_POOL}")
    if USE_POOL:
        make_pool()


async def terminate() -> None:
    global CH_pool
    if CH_pool is not None:
        try:
            CH_pool.close_all()
            logger.info("Closed all connexions to CH")
        except Exception as error:
            logger.error("Error while closing all connexions to CH", exc_info=error)
        finally:
            CH_pool = None
