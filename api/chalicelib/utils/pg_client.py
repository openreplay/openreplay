import time
from threading import Semaphore

import psycopg2
import psycopg2.extras
from decouple import config
from psycopg2 import pool

_PG_CONFIG = {"host": config("pg_host"),
              "database": config("pg_dbname"),
              "user": config("pg_user"),
              "password": config("pg_password"),
              "port": config("pg_port", cast=int),
              "application_name": config("APP_NAME", default="PY")}
PG_CONFIG = dict(_PG_CONFIG)
if config("pg_timeout", cast=int, default=0) > 0:
    PG_CONFIG["options"] = f"-c statement_timeout={config('pg_timeout', cast=int) * 1000}"


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
        super().putconn(*args, **kwargs)
        self._semaphore.release()


postgreSQL_pool: ORThreadedConnectionPool = None

RETRY_MAX = config("PG_RETRY_MAX", cast=int, default=50)
RETRY_INTERVAL = config("PG_RETRY_INTERVAL", cast=int, default=2)
RETRY = 0


def make_pool():
    global postgreSQL_pool
    global RETRY
    if postgreSQL_pool is not None:
        try:
            postgreSQL_pool.closeall()
        except (Exception, psycopg2.DatabaseError) as error:
            print("Error while closing all connexions to PostgreSQL", error)
    try:
        postgreSQL_pool = ORThreadedConnectionPool(config("pg_minconn", cast=int, default=20), 100, **PG_CONFIG)
        if (postgreSQL_pool):
            print("Connection pool created successfully")
    except (Exception, psycopg2.DatabaseError) as error:
        print("Error while connecting to PostgreSQL", error)
        if RETRY < RETRY_MAX:
            RETRY += 1
            print(f"waiting for {RETRY_INTERVAL}s before retry n°{RETRY}")
            time.sleep(RETRY_INTERVAL)
            make_pool()
        else:
            raise error


make_pool()


class PostgresClient:
    connection = None
    cursor = None
    long_query = False

    def __init__(self, long_query=False):
        self.long_query = long_query
        if long_query:
            long_config = dict(_PG_CONFIG)
            long_config["application_name"] += "-LONG"
            self.connection = psycopg2.connect(**_PG_CONFIG)
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
            if self.long_query:
                self.connection.close()
        except Exception as error:
            print("Error while committing/closing PG-connection", error)
            if str(error) == "connection already closed":
                print("Recreating the connexion pool")
                make_pool()
            else:
                raise error
        finally:
            if not self.long_query:
                postgreSQL_pool.putconn(self.connection)


def close():
    pass
