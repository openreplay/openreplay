from sqlalchemy import create_engine
from sqlalchemy import MetaData
from sqlalchemy.orm import sessionmaker, session
from contextlib import contextmanager
import logging
import os
from pathlib import Path

DATABASE = os.environ['DATABASE_NAME']
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
            self.pdredshift.connect_to_redshift(dbname=os.environ['schema'],
                                                host=os.environ['address'],
                                                port=os.environ['port'],
                                                user=os.environ['user'],
                                                password=os.environ['password'])

            self.pdredshift.connect_to_s3(aws_access_key_id=os.environ['aws_access_key_id'],
                                          aws_secret_access_key=os.environ['aws_secret_access_key'],
                                          bucket=os.environ['bucket'],
                                          subdirectory=os.environ['subdirectory'])

            self.connect_str = os.environ['connect_str'].format(
                user=os.environ['user'],
                password=os.environ['password'],
                address=os.environ['address'],
                port=os.environ['port'],
                schema=os.environ['schema']
            )
            self.engine = create_engine(self.connect_str)

        elif config == 'clickhouse':
            self.connect_str = os.environ['connect_str'].format(
                address=os.environ['address'],
                database=os.environ['database']
            )
            self.engine = create_engine(self.connect_str)
        elif config == 'pg':
            self.connect_str = os.environ['connect_str'].format(
                user=os.environ['user'],
                password=os.environ['password'],
                address=os.environ['address'],
                port=os.environ['port'],
                database=os.environ['database']
            )
            self.engine = create_engine(self.connect_str)
        elif config == 'bigquery':
            pass
        elif config == 'snowflake':
            self.connect_str = os.environ['connect_str'].format(
                user=os.environ['user'],
                password=os.environ['password'],
                account=os.environ['account'],
                database=os.environ['database'],
                schema = os.environ['schema'],
                warehouse = os.environ['warehouse']
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

