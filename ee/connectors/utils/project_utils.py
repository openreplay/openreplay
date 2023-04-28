from utils.pg_client import PostgresClient
from queue import Queue
from decouple import config
from time import time


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


class SessionsHistory:

    def __init__(self):
        self.session_project = dict()
        self.max_alive_time = config('MAX_SESSION_LIFE', default=7200) # Default 2 hours

    def add_new(self, sessionid):
        self.session_project[sessionid] = (time(), 'OPEN')

    def add(self, sessionid):
        if sessionid in self.session_project.keys():
            if self.session_project[sessionid][1] == 'CLOSE':
                tmp = self.session_project[sessionid]
                self.session_project[sessionid] = (tmp[0], 'UPDATE')
        else:
            self.add_new(sessionid)

    def close(self, sessionid):
        tmp = self.session_project[sessionid]
        old_status = tmp[1]
        self.session_project[sessionid] = (tmp[0], 'CLOSE')
        return old_status

    def clear_sessions(self):
        to_clean_list = list()
        current_time = time()
        for sessionid, values in self.session_project.items():
            if current_time - values[0] > self.max_alive_time:
                to_clean_list.append(sessionid)
                del self.session_project[sessionid]
        return to_clean_list


class ProjectSelection:

    def __init__(self, selection=list()):
        self.selection = selection
        self.cache_true = list()
        self.cache_false = list()
        self.history = SessionsHistory()
        self.to_clean = list()
        self.count_bad = 0
        self.max_cleanup_size = config('valid_sessions_cache_size', default=50)

    def is_valid(self, sessionId):
        if len(self.selection)==0:
            return True
        elif sessionId in self.cache_true:
            return True
        elif sessionId in self.cache_false:
            return False
        else:
            found_project_id = _project_from_session(sessionId)
            if found_project_id is None:
                self.count_bad += 1
                # TODO: Check problem. Maybe retry ?
                return False
            elif found_project_id in self.selection:
                self.cache_true.append(sessionId)
                return True
            else:
                self.cache_false.append(sessionId)
                return False

    def cleanup(self):
        self.cache_true = [x for x in self.cache_true if not x in self.to_clean]
        self.to_clean = list()
        self.cache_false = list()

    def handle_clean(self, sessionId):
        if len(self.selection)==0:
            return
        self.to_clean.append(sessionId)
        if len(self.to_clean) > self.max_cleanup_size:
            self.cleanup()

