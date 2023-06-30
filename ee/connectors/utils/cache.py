from utils.pg_client import PostgresClient
from decouple import config
from time import time
import json


def _project_from_session(sessionId):
    """Search projectId of requested sessionId in PG table sessions"""
    with PostgresClient() as conn:
         conn.execute(
                 conn.mogrify("SELECT project_id FROM sessions WHERE session_id=%(sessionId)s LIMIT 1",
                             {'sessionId': sessionId})
                 )
         res = conn.fetchone()
    if res is None:
        print(f'[WARN] sessionid {sessionId} not found in sessions table')
        return None
    return res['project_id']


class CachedSessions:

    def __init__(self):
        """cached_sessions of open and recently closed sessions with its current status.
        env:
                MAX_SESSION_LIFE: cache lifespan of session (default 7200 seconds)"""
        self.session_project = dict()
        self.max_alive_time = config('MAX_SESSION_LIFE', default=7800, cast=int) # Default 2 hours

    def create(self, sessionid: int):
        """Saves a new session with status OPEN and set its insertion time"""
        _sessionid = str(sessionid)
        self.session_project[_sessionid] = (time(), 'OPEN')

    def add(self, sessionid: int):
        """Handle the creation of a cached session or update its status if already in cache"""
        _sessionid = str(sessionid)
        if _sessionid in self.session_project.keys():
            if self.session_project[_sessionid][1] == 'CLOSE':
                tmp = self.session_project[_sessionid]
                self.session_project[_sessionid] = (tmp[0], 'UPDATE')
        else:
            self.create(sessionid)

    def close(self, sessionid: int):
        """Sets status of session to closed session (received sessionend message)"""
        _sessionid = str(sessionid)
        tmp = self.session_project[_sessionid]
        old_status = tmp[1]
        self.session_project[_sessionid] = (tmp[0], 'CLOSE')
        return old_status

    def clear_sessions(self):
        """Delete all sessions that reached max_alive_time"""
        to_clean_list = list()
        current_time = time()
        for sessionid, values in self.session_project.items():
            if current_time - values[0] > self.max_alive_time:
                to_clean_list.append(int(sessionid))
        for sessionid in to_clean_list:
            del self.session_project[str(sessionid)]
        return to_clean_list


class ProjectFilter:

    def __init__(self, filter=list()):
        """Filters all sessions that comes from selected projects. This class reads from PG to find projectId and uses cache to avoid duplicated requests.
        env:
            max_cache_size: max allowed cache lenght - starts cleanup when oversize
            cache_lifespan: max lifetime of cached - if surpased it is deleted in cleanup phase"""
        self.filter = filter
        self.cache = dict()
        self.cached_sessions = CachedSessions()
        self.to_clean = list()
        self.count_bad = 0
        self.max_cache_size = config('max_cache_size', default=50, cast=int)
        self.cache_lifespan = config('cache_lifespan', default=900, cast=int)

    def is_valid(self, sessionId):
        """Verify if sessionId is from selected project"""
        if len(self.filter)==0:
            return True
        elif sessionId in self.cache.keys():
            return self.cache[sessionId][1]
        else:
            found_project_id = _project_from_session(sessionId)
            if found_project_id is None:
                self.count_bad += 1
                return False
            else:
                project_is_valid = found_project_id in self.filter
                self.cache[sessionId] = [time(), project_is_valid]
                return project_is_valid

    def cleanup(self):
        """Deletes cache when reached cache_lifespan value"""
        current_time = time()
        self.cache = {sessionid: values for sessionid, values in self.cache.items() if current_time - values[0] < self.cache_lifespan}

    def handle_clean(self):
        """Verifies and execute cleanup if needed"""
        if len(self.filter) == 0:
            return
        elif len(self.cache) > self.max_cache_size:
            self.cleanup()

    def load_checkpoint(self, db):
        file = db.load_binary(name='checkpoint')
        checkpoint = json.loads(file.getvalue().decode('utf-8'))
        file.close()
        self.cache = checkpoint['cache']
        self.to_clean = checkpoint['to_clean']
        self.cached_sessions.session_project = checkpoint['cached_sessions']

    def save_checkpoint(self, db):
        checkpoint = {
            'cache': self.cache,
            'to_clean': self.to_clean,
            'cached_sessions': self.cached_sessions.session_project,
        }
        db.save_binary(binary_data=json.dumps(checkpoint).encode('utf-8'), name='checkpoint')

    def terminate(self, db):
        # self.save_checkpoint(db)
        db.close()
