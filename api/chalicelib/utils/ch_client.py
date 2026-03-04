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

_CH_CONFIG = {
    "host": (config("CLICKHOUSE_HOST") if config("ch_host", default=None) is None
             else config("ch_host")),
    "user": (config("CLICKHOUSE_USER", default="default") if config("ch_user", default=None) is None
             else config("ch_user")),
    "password": (config("CLICKHOUSE_PASSWORD", default="") if config("ch_password", default=None) is None
                 else config("ch_password")),
    "port": (config("CLICKHOUSE_PORT", cast=int) if config("ch_port_http", default=None) is None
             else config("ch_port_http", cast=int)),
    "client_name": config("APP_NAME", default="PY"),
    "database": (config("CLICKHOUSE_DATABASE", default="default") if config("ch_database", default=None) is None
                 else config("ch_database")),
}

USE_TLS = config("CLICKHOUSE_USE_TLS", cast=bool, default=False)
if USE_TLS:
    _CH_CONFIG["secure"] = config("CLICKHOUSE_SECURE", cast=bool, default=True)
    _CH_CONFIG["verify"] = (
        config("CLICKHOUSE_VERIFY", cast=bool, default=True) if config("CLICKHOUSE_TLS_SKIP_VERIFY",
                                                                       default=None) is None
        else not config("CLICKHOUSE_TLS_SKIP_VERIFY", cast=bool))
    _tls_cert = config("CLICKHOUSE_TLS_CERT_PATH", default=None)
    _tls_ca = config("CLICKHOUSE_TLS_CA_PATH", default=None)
    _tls_key = config("CLICKHOUSE_TLS_KEY_PATH", default=None)
    _tls_server_host = config("CLICKHOUSE_SERVER_HOST_NAME", default=None)
    if _tls_cert or _tls_ca:
        _CH_CONFIG["client_cert"] = _tls_cert or _tls_ca
    if _tls_key:
        _CH_CONFIG["client_cert_key"] = _tls_key
    if _tls_server_host:
        _CH_CONFIG["server_host_name"] = _tls_server_host

CH_CONFIG = dict(_CH_CONFIG)
_SETTINGS = {
    "max_execution_time": (
        config("CLICKHOUSE_MAX_EXECUTION_TIME", cast=int, default=-1) if config('ch_timeout', default=None) is None
        else config('ch_timeout', cast=int)
    ),
    "receive_timeout": (
        config('CLICKHOUSE_RECEIVE_TIMEOUT', cast=int, default=-1) if config('ch_receive_timeout', default=None) is None
        else config('ch_receive_timeout', cast=int)
    ),
    "enable_compression": (
        config("CLICKHOUSE_ENABLE_COMPRESSION", cast=bool, default=True) if config("CH_COMPRESSION",
                                                                                   default=None) is None
        else config("CH_COMPRESSION", cast=bool)
    ),
    "compression_algorithm": config("CLICKHOUSE_COMPRESSION_ALGORITHM", default="lz4"),
    "query_limit": (
        config("CLICKHOUSE_QUERY_LIMIT", cast=int, default=0) if config("CH_MAX_ROWS_TO_READ", default=None) is None
        else config("CH_MAX_ROWS_TO_READ", cast=int)
    ),
    "query_retries": (
        config("CLICKHOUSE_QUERY_RETRIES", cast=int, default=0) if config("CH_QUERY_RETRIES", default=None) is None
        else config("CH_QUERY_RETRIES", cast=int)
    ),
    "enable_connection_pool": (
        config('CLICKHOUSE_USE_CONNECTION_POOL', cast=bool, default=True) if config('CH_POOL', default=None) is None
        else config('CH_POOL', cast=bool)
    ),
    "pool_min_connections": (
        config("CLICKHOUSE_POOL_MIN_CONNECTIONS", cast=int, default=4) if config("CH_MINCONN", default=None) is None
        else config("CH_MINCONN", cast=int)
    ),
    "pool_max_connections": (
        config("CLICKHOUSE_POOL_MAX_CONNECTIONS", cast=int, default=8) if config("CH_MAXCONN", default=None) is None
        else config("CH_MAXCONN", cast=int)
    ),
    "pool_get_timeout": (
        config("CLICKHOUSE_GET_CNX_POOL_TIMEOUT_S", cast=int, default=10) if config("CH_WAIT_FOR_CNX_POOL_S",
                                                                                    default=None) is None
        else config("CH_WAIT_FOR_CNX_POOL_S", cast=int)
    ),
    "pool_creation_max_retries": (
        config("CLICKHOUSE_POOL_CREATE_MAX_RETRIES", cast=int, default=10) if config("CH_RETRY_MAX",
                                                                                     default=None) is None
        else config("CH_RETRY_MAX", cast=int)
    ),
    "pool_creation_retries_interval": (
        config("CLICKHOUSE_POOL_CREATION_RETRIES_INTERVAL_S", cast=int, default=2) if config("CH_RETRY_INTERVAL",
                                                                                             default=None) is None
        else config("CH_RETRY_INTERVAL", cast=int, default=2)
    )

}
settings = {}
if _SETTINGS["max_execution_time"] > 0:
    logging.info(f"CH-max_execution_time set to {_SETTINGS["max_execution_time"]}s")
    settings = {**settings, "max_execution_time": _SETTINGS["max_execution_time"]}

if _SETTINGS["receive_timeout"] > 0:
    logging.info(f"CH-receive_timeout set to {_SETTINGS["receive_timeout"]}s")
    settings = {**settings, "receive_timeout": _SETTINGS["receive_timeout"]}

extra_args = {}
if _SETTINGS["enable_compression"]:
    extra_args["compression"] = _SETTINGS["compression_algorithm"]

if _SETTINGS["query_limit"] > 0:
    extra_args["query_limit"] = _SETTINGS["query_limit"]

if _SETTINGS["query_retries"] > 0:
    extra_args["query_retries"] = _SETTINGS["query_retries"]

USE_POOL = _SETTINGS["enable_connection_pool"]


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
                        client = self.pool.get(timeout=_SETTINGS["pool_get_timeout"])
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

RETRY_MAX = _SETTINGS["pool_creation_max_retries"]
RETRY_INTERVAL = _SETTINGS["pool_creation_retries_interval"]


def make_pool():
    if not USE_POOL:
        return
    global CH_pool
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
                CH_pool = ClickHouseConnectionPool(min_size=_SETTINGS["pool_min_connections"],
                                                   max_size=_SETTINGS["pool_max_connections"])
                logger.info("ClickHouse connection pool created successfully")
                return
            except Exception as error:
                logger.error("Error while creating ClickHouse pool", exc_info=error)
                if attempts >= RETRY_MAX:
                    logger.error("Failed to create ClickHouse pool after %d attempts", attempts)
                    raise
                logger.info(f"waiting for {RETRY_INTERVAL}s before retry n°{attempts}")
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
