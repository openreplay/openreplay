import logging
import time
from sqlalchemy import create_engine
from sqlalchemy import MetaData
from sqlalchemy.orm import sessionmaker, session
from contextlib import contextmanager
import logging
from decouple import config as _config
from decouple import Choices
from contextlib import contextmanager
from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))

sslmode = _config('DB_SSLMODE',
        cast=Choices(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']),
        default='allow'
)

conn_str = config('string_connection', default='')
if conn_str == '':
    pg_host = config("pg_host")
    pg_dbname = config("pg_dbname")
    pg_user = config("pg_user")
    pg_password = config("pg_password")
    pg_port = config("pg_port", cast=int)
else:
    import urllib.parse
    conn_str = urllib.parse.unquote(conn_str)
    usr_info, host_info = conn_str.split('@')
    i = usr_info.find('://')
    pg_user, pg_password = usr_info[i+3:].split(':')
    host_info, pg_dbname = host_info.split('/')
    i = host_info.find(':')
    if i == -1:
        pg_host = host_info
        pg_port = 5432
    else:
        pg_host, pg_port = host_info.split(':')
        pg_port = int(pg_port)

conn_str = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_dbname}"

class PostgresClient:
    CONNECTION_STRING: str = conn_str
    _sessions = sessionmaker()

    def __init__(self):
        self.engine = create_engine(self.CONNECTION_STRING, connect_args={'sslmode': sslmode})

    @contextmanager
    def get_live_session(self) -> session:
        """
        This is a session that can be committed.
        Changes will be reflected in the database.
        """
        # Automatic transaction and connection handling in session
        connection = self.engine.connect()
        my_session = type(self)._sessions(bind=connection)

        yield my_session

        my_session.close()
        connection.close()

