from utils.pg_client import PostgresClient
from decouple import config
from utils.df_utils import _process_pg_response
import numpy as np


def get_training_database(projectId, max_timestamp=None, favorites=False):
    """
    Gets training database using projectId, max_timestamp [optional] and favorites (if true adds favorites)
    Params:
        projectId: project id of all sessions to be selected.
        max_timestamp: max timestamp that a not seen session can have in order to be considered not interesting.
        favorites: True to use favorite sessions as interesting sessions reference.
    Output: Tuple (Set of features, set of labels, dict of indexes of each project_id, session_id, user_id in the set)
    """
    args = {"projectId": projectId, "max_timestamp": max_timestamp, "limit": 20}
    with PostgresClient() as conn:
        x1 = signals_features(conn, **args)
        if favorites:
            x2 = user_favorite_sessions(args['projectId'], conn)
        if max_timestamp is not None:
            x3 = user_not_seen_sessions(args['projectId'], args['limit'], conn)

    X_project_ids = dict()
    X_users_ids = dict()
    X_sessions_ids = dict()

    _X = list()
    _Y = list()
    _process_pg_response(x1, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=None)
    if favorites:
        _process_pg_response(x2, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=1)
    if max_timestamp:
        _process_pg_response(x3, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=0)
    return np.array(_X), np.array(_Y), \
           {'project_id': X_project_ids,
            'user_id': X_users_ids,
            'session_id': X_sessions_ids}


def signals_features(conn, **kwargs):
    """
    Selects features from frontend_signals table and mark as interesting given the following conditions:
        * If number of events is greater than events_threshold (default=10). (env value)
        * If session has been replayed more than once.
    """
    assert 'projectId' in kwargs.keys(), 'projectId should be provided in kwargs'
    projectId = kwargs['projectId']
    events_threshold = config('events_threshold', default=10, cast=int)
    query = conn.mogrify("""SELECT
       COALESCE(Ta.project_id, Tb.project_id) as project_id,
       COALESCE(Ta.session_id, Tb.session_id) as session_id,
       COALESCE(Ta.user_id, Tb.user_id) as user_id,
       COALESCE(Ta.viewer_id, Tb.viewer_id) as viewer_id,
       COALESCE(Ta.events_count, Tb.events_count) as events_count,
       COALESCE(Ta.errors_count, Tb.errors_count) as errors_count,
       COALESCE(Ta.duration, Tb.duration) as duration,
       COALESCE(Ta.country, Tb.country) as country,
       COALESCE(Ta.issue_score, Tb.issue_score) as issue_score,
       COALESCE(Ta.device_type, Tb.device_type) as device_type,
       COALESCE(Ta.interesting or Tb.interesting, false) as train_label
    FROM (
               (SELECT T.project_id,
                       T.session_id,
                       T.user_id,
                       T2.viewer_id,
                       T.events_count,
                       T.errors_count,
                       T.duration,
                       T.country,
                       T.issue_score,
                       T.device_type,
                       T2.interesting
                FROM (SELECT project_id, user_id as viewer_id, session_id, count(*) > 1 as interesting
                      FROM (
                               SELECT *, NULLIF(data ->> 'sessionId', '')::bigint as session_id
                               FROM frontend_signals
                               WHERE source = 'replay'
                                 AND project_id = %(projectId)s) as Tin
                      WHERE session_id is not null
                      GROUP BY project_id, viewer_id, session_id) as T2
                         INNER JOIN (SELECT project_id,
                                            session_id,
                                            user_id          as viewer_id,
                                            user_id,
                                            events_count,
                                            errors_count,
                                            duration,
                                            user_country     as country,
                                            issue_score,
                                            user_device_type as device_type
                                     FROM sessions
                                     WHERE project_id = %(projectId)s AND duration IS NOT NULL) as T
                                    ON T.session_id = T2.session_id)
                  as Ta
                  FULL OUTER JOIN (
    SELECT T.project_id,
           T.session_id,
           T.user_id,
           T.viewer_id,
           T.events_count,
           T.errors_count,
           T.duration,
           T.country,
           T.issue_score,
           T.device_type,
           count(T.timestamp) > %(events_threshold)s as interesting
    FROM (
             SELECT T1.project_id,
                    T1.session_id,
                    T2.user_id          as viewer_id,
                    T2.timestamp,
                    T1.user_id,
                    T1.events_count,
                    T1.errors_count,
                    T1.duration,
                    T1.user_country     as country,
                    T1.issue_score,
                    T1.user_device_type as device_type
             FROM (
                      SELECT *
                      FROM sessions
                      WHERE project_id = %(projectId)s AND duration IS NOT NULL) as T1
                      INNER JOIN (
                 SELECT *, NULLIF(data ->> 'sessionId', '')::bigint as session_id
                 FROM frontend_signals
                 WHERE project_id = %(projectId)s) as T2
                                 ON T1.session_id = T2.session_id) as T
    GROUP BY T.project_id, T.session_id, T.user_id, T.viewer_id, T.events_count, T.errors_count, T.duration, T.country,
             T.issue_score, T.device_type
) as Tb
                             ON Tb.session_id = Ta.session_id AND Tb.viewer_id=Ta.viewer_id
    )""",
                         {"projectId": projectId, "events_threshold": events_threshold})
    conn.execute(query)
    res = conn.fetchall()
    return res


def user_favorite_sessions(projectId, conn):
    """
    Selects features from user_favorite_sessions table.
    """
    query = """SELECT project_id, session_id, user_id, viewer_id, events_count, errors_count, duration, country, issue_score, device_type FROM (
    (SELECT session_id, project_id, user_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
    FROM sessions WHERE project_id=%(projectId)s) AS T1
    INNER JOIN (SELECT user_id as viewer_id, session_id as fav_session_id FROM user_favorite_sessions) as T2
    ON T1.session_id=T2.fav_session_id) AS T"""
    conn.execute(
        conn.mogrify(query, {"projectId": projectId})
    )
    res = conn.fetchall()
    return res


def user_not_seen_sessions(projectId, limit, conn):
    """
    Selects features from user_viewed_sessions table.
    """
    query = """SELECT project_id, session_id, user_id, viewer_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
FROM (
         (SELECT *
         FROM sessions
         WHERE project_id = %(projectId)s AND session_id NOT IN (SELECT session_id FROM user_viewed_sessions) AND duration IS NOT NULL
         LIMIT %(limit)s) AS T1
             LEFT JOIN
         (SELECT user_id as viewer_id
         FROM users
         WHERE tenant_id IN (SELECT tenant_id FROM projects WHERE project_id = %(projectId)s)) AS T2 ON true
     )"""
    conn.execute(
        conn.mogrify(query, {"projectId": projectId, "limit": limit})
    )
    res = conn.fetchall()
    return res
