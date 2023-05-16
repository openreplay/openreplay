import json
import queue
import logging
from decouple import config
from time import time

#from utils import pg_client
from mlflow.store.db.utils import create_sqlalchemy_engine
from sqlalchemy.orm import sessionmaker, session
from sqlalchemy import text
from contextlib import contextmanager

global_queue = None


class ConnectionHandler:
    _sessions = sessionmaker()
    def __init__(self, uri):
        self.engine = create_sqlalchemy_engine(uri)

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


class EventQueue:
    def __init__(self, queue_max_length=50):
        self.events = queue.Queue()
        self.events.maxsize = queue_max_length
        host = config('pg_host_ml')
        port = config('pg_port_ml')
        user = config('pg_user_ml')
        dbname = config('pg_dbname_ml')
        password = config('pg_password_ml')

        tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
        self.connection_handler = ConnectionHandler(tracking_uri)
        self.last_flush = time()
        self.max_retention_time = config('max_retention_time', default=60*60) # One hour

    def flush(self, conn):
        events = list()
        params = dict()
        i = 0
        insertion_time = time()
        while not self.events.empty():
            user_id, session_id, project_id, payload = self.events.get()
            params[f'user_id_{i}'] = user_id
            params[f'session_id_{i}'] = session_id
            params[f'project_id_{i}'] = project_id
            params[f'payload_{i}'] = json.dumps(payload)
            events.append(
                f"(%(user_id_{i})s, %(session_id_{i})s, %(payload_{i})s::jsonb, {insertion_time})")
            i += 1
        self.last_flush = time()
        if i == 0:
            return 0
        cur = conn.connection().connection.cursor()
        query = cur.mogrify(f"""INSERT INTO recommendation_feedback (user_id, session_id, project_id, payload, insertion_time) VALUES {' , '.join(events)};""", params)
        conn.execute(text(query.decode("utf-8")))
        conn.commit()
        return 1

    def force_flush(self):
        if not self.events.empty():
            try:
                with self.connection_handler.get_live_session() as conn:
                    self.flush(conn)
            except Exception as e:
                print(f'Error: {e}')

    def put(self, element):
        current_time = time()
        if self.events.full() or current_time - self.last_flush > self.max_retention_time:
            try:
                with self.connection_handler.get_live_session() as conn:
                    self.flush(conn)
            except Exception as e:
                print(f'Error: {e}')
        self.events.put(element)
        self.events.task_done()


async def init():
    global global_queue
    global_queue = EventQueue()
    print("> queue initialized")


async def terminate():
    global global_queue
    if global_queue is not None:
        global_queue.force_flush()
        print('> queue fulshed')