import psycopg2
import psycopg2.extras
from decouple import config

PG_CONFIG = {"host": config("pg_host"),
             "database": config("pg_dbname"),
             "user": config("pg_user"),
             "password": config("pg_password"),
             "port": config("pg_port", cast=int)}

from psycopg2 import pool
from threading import Semaphore


class ORThreadedConnectionPool(psycopg2.pool.ThreadedConnectionPool):
    def __init__(self, minconn, maxconn, *args, **kwargs):
        self._semaphore = Semaphore(maxconn)
        super().__init__(minconn, maxconn, *args, **kwargs)

    def getconn(self, *args, **kwargs):
        self._semaphore.acquire()
        return super().getconn(*args, **kwargs)

    def putconn(self, *args, **kwargs):
        super().putconn(*args, **kwargs)
        self._semaphore.release()


try:
    postgreSQL_pool = ORThreadedConnectionPool(50, 100, **PG_CONFIG)
    if (postgreSQL_pool):
        print("Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("Error while connecting to PostgreSQL", error)
    raise error


class PostgresClient:
    connection = None
    cursor = None

    def __init__(self):
        self.connection = postgreSQL_pool.getconn()

    def __enter__(self):
        if self.cursor is None:
            self.cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return self.cursor

    def __exit__(self, *args):
        try:
            self.connection.commit()
            self.cursor.close()
        except Exception as error:
            print("Error while committing/closing PG-connection", error)
            raise error
        finally:
            postgreSQL_pool.putconn(self.connection)


def close():
    pass
