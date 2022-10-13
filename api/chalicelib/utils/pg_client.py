import logging
import time
from threading import Semaphore

import psycopg2
import psycopg2.extras
from decouple import config
from psycopg2 import pool

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))

_PG_CONFIG = {"host": config("pg_host"),
              "database": config("pg_dbname"),
              "user": config("pg_user"),
              "password": config("pg_password"),
              "port": config("pg_port", cast=int),
              "application_name": config("APP_NAME", default="PY")}
PG_CONFIG = dict(_PG_CONFIG)
if config("PG_TIMEOUT", cast=int, default=0) > 0:
    PG_CONFIG["options"] = f"-c statement_timeout={config('PG_TIMEOUT', cast=int) * 1000}"

logging.info(f">PG_POOL:{config('PG_POOL', default=None)}")


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
                print("!!! trying to put unkeyed connection")
                print(f"env-PG_POOL:{config('PG_POOL', default=None)}")
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
            logging.error("Error while closing all connexions to PostgreSQL", error)
    try:
        postgreSQL_pool = ORThreadedConnectionPool(config("PG_MINCONN", cast=int, default=20),
                                                   config("PG_MAXCONN", cast=int, default=80),
                                                   **PG_CONFIG)
        if (postgreSQL_pool):
            logging.info("Connection pool created successfully")
    except (Exception, psycopg2.DatabaseError) as error:
        logging.error("Error while connecting to PostgreSQL", error)
        if RETRY < RETRY_MAX:
            RETRY += 1
            logging.info(f"waiting for {RETRY_INTERVAL}s before retry n°{RETRY}")
            time.sleep(RETRY_INTERVAL)
            make_pool()
        else:
            raise error


if config('PG_POOL', cast=bool, default=True):
    make_pool()


class PostgresClient:
    connection = None
    cursor = None
    long_query = False
    unlimited_query = False

    def __init__(self, long_query=False, unlimited_query=False):
        self.long_query = long_query
        self.unlimited_query = unlimited_query
        if unlimited_query:
            long_config = dict(_PG_CONFIG)
            long_config["application_name"] += "-UNLIMITED"
            self.connection = psycopg2.connect(**long_config)
        elif long_query:
            long_config = dict(_PG_CONFIG)
            long_config["application_name"] += "-LONG"
            long_config["options"] = f"-c statement_timeout=" \
                                     f"{config('pg_long_timeout', cast=int, default=5 * 60) * 1000}"
            self.connection = psycopg2.connect(**long_config)
        elif not config('PG_POOL', cast=bool, default=True):
            single_config = dict(_PG_CONFIG)
            single_config["application_name"] += "-NOPOOL"
            single_config["options"] = f"-c statement_timeout={config('PG_TIMEOUT', cast=int, default=30) * 1000}"
            self.connection = psycopg2.connect(**single_config)
        else:
            self.connection = postgreSQL_pool.getconn()

    def __enter__(self):
        if self.cursor is None:
            self.cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return self.cursor

    def __exit__(self, *args):
        try:
            self.connection.commit()
            self.cursor.close()
            if self.long_query or self.unlimited_query:
                self.connection.close()
        except Exception as error:
            logging.error("Error while committing/closing PG-connection", error)
            if str(error) == "connection already closed" \
                    and not self.long_query \
                    and not self.unlimited_query \
                    and config('PG_POOL', cast=bool, default=True):
                logging.info("Recreating the connexion pool")
                make_pool()
            else:
                raise error
        finally:
            if config('PG_POOL', cast=bool, default=True) \
                    and not self.long_query \
                    and not self.unlimited_query:
                postgreSQL_pool.putconn(self.connection)


def close():
    pass
