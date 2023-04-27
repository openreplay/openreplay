from utils.pg_client import PostgresClient
from queue import Queue
from decouple import config


def _project_from_session(sessionId):
    with PostgresClient() as conn:
         conn.execute(
                 conn.mogrify("SELECT project_id FROM sessions WHERE session_id=%(sessionId)s LIMIT 1",
                             {'sessionId': sessionId})
                 )
         res = conn.fetchone()
    if res is None:
        print('[WARN] Session not found in sessions ids')
        return None
    return res['project_id']


class ProjectSelection:

    def __init__(self, selection=list()):
        self.selection = selection
        self.cache = list()
        self.to_clean = list()
        self.count_bad = 0
        self.max_cleanup_size = config('valid_sessions_cache_size', default=50)

    def is_valid(self, sessionId):
        if len(self.selection)==0:
            return True
        elif sessionId in self.cache:
            return True
        else:
            found_project_id = _project_from_session(sessionId)
            if found_project_id is None:
                self.count_bad += 1
                # TODO: Check problem. Maybe retry ?
                return False
            elif found_project_id in self.selection:
                self.cache.append(sessionId)
                return True
            else:
                return False

    def cleanup(self):
        self.cache = [x for x in self.cache if not x in self.to_clean]
        self.to_clean = list()

    def handle_clean(self, sessionId):
        if len(self.selection)==0:
            return
        self.to_clean.append(sessionId)
        if len(self.to_clean) > self.max_cleanup_size:
            self.cleanup()

