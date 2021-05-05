import psycopg2
import psycopg2.extras
from chalicelib.utils.helper import environ

PG_CONFIG = {"host": environ["pg_host"],
             "database": environ["pg_dbname"],
             "user": environ["pg_user"],
             "password": environ["pg_password"],
             "port": int(environ["pg_port"])}

# connexion pool for FOS & EE

from psycopg2 import pool

try:
    postgreSQL_pool = psycopg2.pool.ThreadedConnectionPool(6, 20, **PG_CONFIG)
    if (postgreSQL_pool):
        print("Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("Error while connecting to PostgreSQL", error)
    raise error


# finally:
#     # closing database connection.
#     # use closeall method to close all the active connection if you want to turn of the application
#     if (postgreSQL_pool):
#         postgreSQL_pool.closeall
#     print("PostgreSQL connection pool is closed")

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
        except:
            print("Error while committing/closing PG-connection", error)
            raise error
        finally:
            postgreSQL_pool.putconn(self.connection)


def close():
    pass
