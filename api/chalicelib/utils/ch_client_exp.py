import logging
import threading
import time
from functools import wraps
from queue import Queue, Empty

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
        if kwargs.get("parameters"):
            logger.debug(str.encode(self.format(query=kwargs.get("query", ""), parameters=kwargs.get("parameters"))))
        elif len(args) > 0:
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

    def format(self, query, parameters=None):
        if parameters:
            ctx = QueryContext(query=query, parameters=parameters)
            return ctx.final_query
        return query

    def __exit__(self, *args):
        if config('CH_POOL', cast=bool, default=True):
            CH_pool.release_connection(self.__client)
        else:
            self.__client.close()


async def init():
    logger.info(f">use CH_POOL:{config('CH_POOL', default=True)}")
    if config('CH_POOL', cast=bool, default=True):
        make_pool()


async def terminate():
    global CH_pool
    if CH_pool is not None:
        try:
            CH_pool.close_all()
            logger.info("Closed all connexions to CH")
        except Exception as error:
            logger.error("Error while closing all connexions to CH", exc_info=error)
