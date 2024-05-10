import json
import queue
import logging
from decouple import config
from time import time

from mlflow.store.db.utils import create_sqlalchemy_engine
from sqlalchemy.orm import sessionmaker, session
from sqlalchemy import text
from contextlib import contextmanager

global_queue = None


class ConnectionHandler:
    _sessions = sessionmaker()
    def __init__(self, uri):
        """Connects into mlflow database."""
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
        """Saves all recommendations until queue_max_length (default 50) is reached
        or max_retention_time surpassed (env value, default 1 hour)."""
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
        self.max_retention_time = config('max_retention_time', default=60*60)
        self.feedback_short_mem = list()

    def flush(self, conn):
        """Insert recommendations into table recommendation_feedback from mlflow database."""
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
                f"(%(user_id_{i})s, %(session_id_{i})s, %(project_id_{i})s, %(payload_{i})s::jsonb, {insertion_time})")
            i += 1
        self.last_flush = time()
        self.feedback_short_mem = list()
        if i == 0:
            return 0
        cur = conn.connection().connection.cursor()
        query = cur.mogrify(f"""INSERT INTO recommendation_feedback (user_id, session_id, project_id, payload, insertion_time) VALUES {' , '.join(events)};""", params)
        conn.execute(text(query.decode("utf-8")))
        conn.commit()
        return 1

    def force_flush(self):
        """Force method flush."""
        if not self.events.empty():
            try:
                with self.connection_handler.get_live_session() as conn:
                    self.flush(conn)
            except Exception as e:
                print(f'Error: {e}')

    def put(self, element):
        """Adds recommendation into the queue."""
        current_time = time()
        if self.events.full() or current_time - self.last_flush > self.max_retention_time:
            try:
                with self.connection_handler.get_live_session() as conn:
                    self.flush(conn)
            except Exception as e:
                print(f'Error: {e}')
        self.events.put(element)
        self.feedback_short_mem.append(element[:3])
        self.events.task_done()

    def already_has_feedback(self, element):
        """"This method verifies if a feedback is already send for the current user-project-sessionId."""
        if element[:3] in self.feedback_short_mem:
            return True
        else:
            with self.connection_handler.get_live_session() as conn:
                cur = conn.connection().connection.cursor()
                query = cur.mogrify("SELECT * FROM recommendation_feedback WHERE user_id=%(user_id)s AND session_id=%(session_id)s AND project_id=%(project_id)s LIMIT 1",
                                    {'user_id': element[0], 'session_id': element[1], 'project_id': element[2]})
                cur_result = conn.execute(text(query.decode('utf-8')))
                res = cur_result.fetchall()
            return len(res) == 1


def has_feedback(data):
    global global_queue
    assert global_queue is not None, 'Global queue is not yet initialized'
    return global_queue.already_has_feedback(data)


async def init():
    global global_queue
    global_queue = EventQueue()
    print("> queue initialized")


async def terminate():
    global global_queue
    if global_queue is not None:
        global_queue.force_flush()
        print('> queue fulshed')
