from utils.pg_client import PostgresClient
from decouple import config
from utils.df_utils import _add_to_dict
from utils.declarations import CountryValue, DeviceValue
import numpy as np


def get_training_database(projectId=None):
    args = {"projectId": projectId, }
    with PostgresClient() as conn:
        x1 = signals_features(conn, **args)

    X_project_ids = dict()
    X_users_ids = dict()
    X_sessions_ids = dict()

    _X = list()
    _Y = list()
    n1 = len(x1)
    for i in range(n1):
        x = x1[i]
        _add_to_dict(x.pop('project_id'), i, X_project_ids)
        _add_to_dict(x.pop('session_id'), i, X_sessions_ids)
        _add_to_dict(x.pop('user_id'), i, X_users_ids)
        _Y.append(x.pop('train_label'))

        x['country'] = CountryValue(x['country']).get_int_val()
        x['device_type'] = DeviceValue(x['device_type']).get_int_val()
        _X.append(list(x.values()))
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
