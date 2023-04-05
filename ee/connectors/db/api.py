from sqlalchemy import create_engine
from sqlalchemy import MetaData
from sqlalchemy.orm import sessionmaker, session
from contextlib import contextmanager
import logging
from decouple import config as _config
from pathlib import Path

DATABASE = _config('DATABASE_NAME')
if DATABASE == 'redshift':
    import pandas_redshift as pr

base_path = Path(__file__).parent.parent

from db.models import Base

logger = logging.getLogger(__file__)


def get_class_by_tablename(tablename):
    """Return class reference mapped to table.
    Raise an exception if class not found

    :param tablename: String with name of table.
    :return: Class reference.
    """
    for c in Base._decl_class_registry.values():
        if hasattr(c, '__tablename__') and c.__tablename__ == tablename:
            return c
    raise AttributeError(f'No model with tablename "{tablename}"')


class DBConnection:
    """
    Initializes connection to a database
    To update models file use:
    sqlacodegen --outfile models_universal.py mysql+pymysql://{user}:{pwd}@{address}
    """
    _sessions = sessionmaker()

    def __init__(self, config) -> None:
        self.metadata = MetaData()
        self.config = config

        if config == 'redshift':
            self.pdredshift = pr
            self.pdredshift.connect_to_redshift(dbname=_config('schema'),
                                                host=_config('address'),
                                                port=_config('port'),
                                                user=_config('user'),
                                                password=_config('password'))

            self.pdredshift.connect_to_s3(aws_access_key_id=_config('aws_access_key_id'),
                                          aws_secret_access_key=_config('aws_secret_access_key'),
                                          bucket=_config('bucket'),
                                          subdirectory=_config('subdirectory'))

            self.connect_str = _config('connect_str').format(
                user=_config('user'),
                password=_config('password'),
                address=_config('address'),
                port=_config('port'),
                schema=_config('schema')
            )
            self.engine = create_engine(self.connect_str)

        elif config == 'clickhouse':
            self.connect_str = _config('connect_str').format(
                address=_config('address'),
                database=_config('database')
            )
            self.engine = create_engine(self.connect_str)
        elif config == 'pg':
            self.connect_str = _config('connect_str').format(
                user=_config('user'),
                password=_config('password'),
                address=_config('address'),
                port=_config('port'),
                database=_config('database')
            )
            self.engine = create_engine(self.connect_str)
        elif config == 'bigquery':
            pass
        elif config == 'snowflake':
            self.connect_str = _config('connect_str').format(
                user=_config('user'),
                password=_config('password'),
                account=_config('account'),
                database=_config('database'),
                schema = _config('schema'),
                warehouse = _config('warehouse')
            )
            self.engine = create_engine(self.connect_str)
        else:
            raise ValueError("This db configuration doesn't exist. Add into keys file.")

    @contextmanager
    def get_test_session(self, **kwargs) -> session:
        """
        Test session context, even commits won't be persisted into db.
        :Keyword Arguments:
            * autoflush (``bool``) -- default: True
            * autocommit (``bool``) -- default: False
            * expire_on_commit (``bool``) -- default: True
        """
        connection = self.engine.connect()
        transaction = connection.begin()
        my_session = type(self)._sessions(bind=connection, **kwargs)
        yield my_session

        # Do cleanup, rollback and closing, whatever happens
        my_session.close()
        transaction.rollback()
        connection.close()

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

