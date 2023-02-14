from utils.ch_client import ClickHouseClient
from utils.pg_client import PostgresClient

def get_features_clickhouse(**kwargs):
    """Gets features from ClickHouse database"""
    #FOR ALL SESSIONS
    if 'limit' in kwargs:
        limit = kwargs['limit']
    else:
        limit = 500
    query = f"""SELECT session_id, project_id, user_id, events_count, errors_count, duration, country, issue_score, device_type, rage, jsexception, badrequest FROM (
    SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE user_id IS NOT NULL) as T1
INNER JOIN (SELECT session_id, project_id, sum(issue_type = 'click_rage') as rage, sum(issue_type = 'js_exception') as jsexception, sum(issue_type = 'bad_request') as badrequest FROM experimental.events WHERE event_type = 'ISSUE' AND session_id > 0 GROUP BY session_id, project_id LIMIT {limit}) as T2
ON T1.session_id = T2.session_id AND T1.project_id = T2.project_id;"""
    with ClickHouseClient() as conn:
        res = conn.execute(query)
    return res


def get_features_postgres(**kwargs):
    # DOES NOT CONTAIN SESSION ID
    with PostgresClient() as conn:
        funnels = query_funnels(conn, **kwargs)
        metrics = query_metrics(conn, **kwargs)
        filters = query_with_filters(conn, **kwargs)
    #clean_filters(funnels)
    #clean_filters(filters)
    return clean_filters_split(funnels, isfunnel=True), metrics, clean_filters_split(filters)



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


def transform_funnel(project_id, user_id, data):
    res = list()
    for k in range(len(data)):
        _tmp = data[k]
        if _tmp['project_id'] != project_id or _tmp['user_id'] != user_id:
            continue
        else:
            _tmp = _tmp['filter']['events']
            res.append(_tmp)
    return res


def transform_with_filter(data, *kwargs):
    res = list()
    for k in range(len(data)):
        _tmp = data[k]
        jump = False
        for _key in kwargs.keys():
            if data[_key] != kwargs[_key]:
                jump = True
                break
        if jump:
            continue
        _type = data['metric_type']
        if _type == 'funnel':
            res.append(['funnel', _tmp['filter']['events']])
        elif _type == 'timeseries':
            res.append(['timeseries', _tmp['filter']['filters'], _tmp['filter']['events']])
        elif _type == 'table':
            res.append(['table', _tmp['metric_of'], _tmp['filter']['events']])
    return res


def transform(element):
    key_ = element.pop('user_id')
    secondary_key_ = element.pop('session_id')
    context_ = element.pop('project_id')
    features_ = element
    del element
    return {(key_, context_): {secondary_key_: list(features_.values())}}


def get_by_project(data, project_id):
    head_ = [list(d.keys())[0][1] for d in data]
    index_ = [k for k in range(len(head_)) if head_[k] == project_id]
    return [data[k] for k in index_]


def get_by_user(data, user_id):
    head_ = [list(d.keys())[0][0] for d in data]
    index_ = [k for k in range(len(head_)) if head_[k] == user_id]
    return [data[k] for k in index_]


def clean_filters(data):
    for j in range(len(data)):
        _filter = data[j]['filter']
        _tmp = list()
        for i in range(len(_filter['filters'])):
            if 'value' in _filter['filters'][i].keys():
                _tmp.append({'type': _filter['filters'][i]['type'],
                                                   'value': _filter['filters'][i]['value'],
                                                   'operator': _filter['filters'][i]['operator']})
        data[j]['filter'] = _tmp


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


def get_favorites():
    #TODO: Get features for these sessions
    query_1 = """SELECT * FROM experimental.user_favorite_sessions as t1 INNER JOIN (SELECT * FROM experimental.sessions) as t2 ON t1.session_id=t2.session_id"""
    query_2 = """SELECT * FROM experimental.user_viewed_sessions as t1 INNER JOIN (SELECT * FROM experimental.sessions) as t2 ON t1.session_id=t2.session_id"""
    with ClickHouseClient() as conn:
        res1 = conn.execute(query_1)
        res2 = conn.execute(query_2)
    return {'favorite': res1, 'viewed': res2}

def get_latest_sessions():
    #TODO: Do we need this?
    query = """SELECT * FROM sessions ORDER BY _timestamp LIMIT 100 """


def test():
    print('One test')

if __name__ == '__main__':
    print('Just a test')
    #data = get_features_clickhouse()
    #print('Data length:', len(data))
