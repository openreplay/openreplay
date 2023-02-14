from utils.pg_client import PostgresClient

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
