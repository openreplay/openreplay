from utils.pg_client import PostgresClient
from decouple import config
from utils.df_utils import _add_to_dict, _process_pg_response
import numpy as np


def get_training_database(projectId=None, max_timestamp=None, favorites=False):
    #TODO: Set a pertinent limit to number of not seen values (balance dataset)
    args = {"projectId": projectId, "max_timestamp": max_timestamp}
    with PostgresClient() as conn:
        x1 = signals_features(conn, **args)
        if favorites:
            x2 = user_favorite_sessions(args['projectId'], conn)
        if max_timestamp is not None:
            x3 = user_not_seen_sessions(args['projectId'], args['max_timestamp'], conn)

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
    assert 'projectId' in kwargs.keys(), 'projectId should be provided in kwargs'
    projectId = kwargs['projectId']
    events_threshold = config('events_threshold', default=10)
    query = conn.mogrify("""SELECT T.project_id, T.session_id, T.user_id, T.viewer_id, T.events_count, T.errors_count, T.duration, T.country, T.issue_score, T.device_type, count(T.timestamp) > %(events_threshold)s as train_label
    FROM (
        SELECT T1.project_id, T1.session_id, T2.user_id as viewer_id, action, source, category, T2.timestamp, T1.user_id, T1.events_count, T1.errors_count, T1.duration, T1.user_country as country, T1.issue_score, T1.user_device_type as device_type
        FROM (
            SELECT * FROM sessions WHERE project_id=%(projectId)s) as T1
            INNER JOIN (
                SELECT *, NULLIF(data ->> 'sessionId', '')::bigint as session_id FROM frontend_signals WHERE project_id=%(projectId)s) as T2
                ON T1.session_id=T2.session_id) as T
    GROUP BY T.project_id, T.session_id, T.user_id, T.viewer_id, T.events_count, T.errors_count, T.duration, T.country, T.issue_score, T.device_type""",
                         {"projectId": projectId, "events_threshold": events_threshold})
    conn.execute(query)
    res = conn.fetchall()
    return res


def user_favorite_sessions(projectId, conn):
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


def user_not_seen_sessions(projectId, max_timestamp, conn):
    query = """SELECT project_id, session_id, user_id, viewer_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
FROM (
         (SELECT *
         FROM sessions
         WHERE project_id = %(projectId)s AND start_ts < %(maxTimestamp)s AND session_id NOT IN (SELECT session_id FROM user_viewed_sessions)
         LIMIT 100) AS T1
             LEFT JOIN
         (SELECT user_id as viewer_id
         FROM users
         WHERE tenant_id IN (SELECT tenant_id FROM projects WHERE project_id = %(projectId)s)) AS T2 ON true
     )"""
    conn.execute(
        conn.mogrify(query, {"projectId": projectId, "maxTimestamp": max_timestamp})
    )
    res = conn.fetchall()
    return res


def query_funnels(conn, **kwargs):
    """Gets Funnels (PG database)"""
    # If public.funnel is empty
    funnels_query = f"""SELECT project_id, user_id, filter FROM (SELECT project_id, user_id, metric_id FROM public.metrics WHERE metric_type='funnel'
    ) as T1 LEFT JOIN (SELECT filter, metric_id FROM public.metric_series) as T2 ON T1.metric_id = T2.metric_id"""
    # Else
    # funnels_query = "SELECT project_id, user_id, filter FROM public.funnels"

    conn.execute(funnels_query)
    res = conn.fetchall()
    return res


def query_metrics(conn, **kwargs):
    """Gets Metrics (PG_database)"""
    metrics_query = """SELECT metric_type, metric_of, metric_value, metric_format FROM public.metrics"""
    conn.execute(metrics_query)
    res = conn.fetchall()
    return res


def query_with_filters(conn, **kwargs):
    """Gets Metrics with filters (PG database)"""
    filters_query = """SELECT T1.metric_id as metric_id, project_id, name, metric_type, metric_of, filter FROM (
    SELECT metric_id, project_id, name, metric_type, metric_of FROM metrics) as T1 INNER JOIN
    (SELECT metric_id, filter FROM metric_series WHERE filter != '{}') as T2 ON T1.metric_id = T2.metric_id"""
    conn.execute(filters_query)
    res = conn.fetchall()
    return res


def clean_filters_split(data, isfunnel=False):
    _data = list()
    for j in range(len(data)):
        _filter = data[j]['filter']
        _tmp = list()
        for i in range(len(_filter['filters'])):
            if 'value' in _filter['filters'][i].keys():
                _type = _filter['filters'][i]['type']
                _value = _filter['filters'][i]['value']
                if isinstance(_value, str):
                    _value = [_value]
                _operator = _filter['filters'][i]['operator']
                if isfunnel:
                    _data.append({'project_id': data[j]['project_id'], 'user_id': data[j]['user_id'],
                                  'type': _type,
                                  'value': _value,
                                  'operator': _operator
                                  })
                else:
                    _data.append({'metric_id': data[j]['metric_id'], 'project_id': data[j]['project_id'],
                                  'name': data[j]['name'], 'metric_type': data[j]['metric_type'],
                                  'metric_of': data[j]['metric_of'],
                                  'type': _type,
                                  'value': _value,
                                  'operator': _operator
                                  })
    return _data


def get_features_postgres(**kwargs):
    with PostgresClient() as conn:
        funnels = query_funnels(conn, **kwargs)
        metrics = query_metrics(conn, **kwargs)
        filters = query_with_filters(conn, **kwargs)
    return clean_filters_split(funnels, isfunnel=True), metrics, clean_filters_split(filters)
