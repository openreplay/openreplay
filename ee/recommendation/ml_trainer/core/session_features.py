from utils.ch_client import ClickHouseClient
import numpy as np


def get_training_database(user_id=None):
    x1 = get_seen(user_id=user_id)
    x2 = get_unseen(user_id=user_id, limit=len(x1))

    X_project_ids = dict()
    X_users_ids = dict()
    X_sessions_ids = dict()

    _X = list()
    n1, n2 = len(x1), len(x2)
    for i in range(n1):
        x = x1[i]
        __add_to_dict(x.pop('project_id'), i, X_project_ids)
        __add_to_dict(x.pop('session_id'), i, X_sessions_ids)
        __add_to_dict(x.pop('user_id'), i, X_users_ids)
        _X.append(list(x.values()))
    for i in range(n2):
        x = x2[i]
        __add_to_dict(x.pop('project_id'), i+n1, X_project_ids)
        __add_to_dict(x.pop('session_id'), i+n1, X_sessions_ids)
        __add_to_dict(x.pop('user_id'), i+n1, X_users_ids)
        _X.append(list(x.values()))
    _Y = np.array([1]*n1+[0]*n2)
    return np.array(_X), np.array(_Y),\
           {'project_id': X_project_ids,
            'user_id': X_users_ids,
            'session_id': X_sessions_ids}


def get_issues(**kwargs):
    """Gets features from ClickHouse database"""
    #TODO: See how to deal with sessions without event_type==issue
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


def get_favorites():
    #TODO: Get features for these sessions
    # query_1 = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions as t1 INNER JOIN (SELECT * FROM experimental.user_favorite_sessions) as t2 ON t1.session_id=t2.session_id"""
    # query_2 = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions as t1 INNER JOIN (SELECT * FROM experimental.user_viewed_sessions) as t2 ON t1.session_id=t2.session_id"""
    query_1 = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE session_id IN (SELECT session_id FROM experimental.user_favorite_sessions)"""
    query_2 = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE session_id IN (SELECT session_id FROM experimental.user_viewed_sessions)"""
    with ClickHouseClient() as conn:
        res1 = conn.execute(query_1)
        res2 = conn.execute(query_2)
    return {'favorite': res1, 'viewed': res2}


def get_sessions():
    query = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE user_id IS NOT NULL ORDER BY _timestamp DESC LIMIT 100"""
    with ClickHouseClient() as conn:
        res = conn.execute(query)
    return res


def get_seen(user_id=None):
    with ClickHouseClient() as conn:
        if user_id is None:
            query = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE session_id IN (SELECT session_id FROM experimental.user_viewed_sessions)"""
            res = conn.execute(query)
        else:
            query = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type FROM experimental.sessions WHERE session_id IN (SELECT session_id FROM experimental.user_viewed_sessions WHERE user_id = %(user_id)s)"""
            res = conn.execute(query, params={'user_id': user_id})
    return res


def get_unseen(max_timestamp=None, user_id=None, limit=100):
    with ClickHouseClient() as conn:
        try:
            if max_timestamp is None:
                _query = """SELECT max(datetime) as top_date FROM experimental.sessions WHERE session_id IN (SELECT session_id FROM experimental.user_favorite_sessions)"""
                max_timestamp = conn.execute(_query)[0]['top_date']
            if user_id is None:
                query = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type
                        FROM experimental.sessions WHERE datetime < %(timestamp)s AND session_id NOT IN (SELECT session_id FROM experimental.user_viewed_sessions) AND user_id IS NOT NULL LIMIT %(limit)s"""
                res = conn.execute(query, params={'timestamp': max_timestamp, 'limit': limit})
            else:
                query = """SELECT session_id, project_id, user_id, events_count, errors_count, duration, toInt8(user_country) as country, issue_score, toInt8(user_device_type) as device_type
                        FROM experimental.sessions WHERE datetime < %(timestamp)s AND session_id NOT IN (SELECT session_id FROM experimental.user_viewed_sessions) AND user_id=%{user_id}s NULL LIMIT %(limit)s"""
                res = conn.execute(query, params={'timestamp': max_timestamp, 'limit': limit, 'user_id': user_id})
        except Exception as e:
            raise Exception(f'Exception: {e}')
    return res


def __fill_missing(missing_list, reference):
    for data in missing_list:
        if data['session_id'] in reference:
            _index = reference.index(data['session_id'])
            data['rage'] = reference[_index]['rage']
            data['jsexception'] = reference[_index]['jsexception']
            data['badrequest'] = reference[_index]['badrequest']
        else:
            data['rage'] = 0
            data['jsexception'] = 0
            data['badrequest'] = 0


def ch_features(with_issues=False):
    y = get_favorites()
    z = get_sessions()
    if with_issues:
        x = get_issues()
        issues_sessions = [e['session_id'] for e in x]
        __fill_missing(y['favorite'], issues_sessions)
        __fill_missing(y['viewed'], issues_sessions)
        __fill_missing(z, issues_sessions)
        return z, y, x
    return z, y, None


def __add_to_dict(element, index, dictionary):
    if element not in dictionary.keys():
        dictionary[element] = [index]
    else:
        dictionary[element].append(index)


def dataset(test=True, selection='viewed'):
    if not test:
        X = get_sessions()

        X_project_ids = dict()
        X_users_ids = dict()
        X_sessions_ids = dict()

        _X = list()
        for i in range(len(X)):
            x = X[i]
            __add_to_dict(x.pop('project_id'), i, X_project_ids)
            __add_to_dict(x.pop('session_id'), i, X_sessions_ids)
            __add_to_dict(x.pop('user_id'), i, X_users_ids)
            _X.append(list(x.values()))

        return np.array(_X), None, \
               {'project_id': X_project_ids,
                'user_id': X_users_ids,
                'session_id': X_sessions_ids}, \
                None
    else:
        X, Y, _ = ch_features()
        _X = list()
        _Y = list()
        X_project_ids = dict()
        X_users_ids = dict()
        X_sessions_ids = dict()

        for i in range(len(X)):
            x = X[i]
            __add_to_dict(x.pop('project_id'), i, X_project_ids)
            __add_to_dict(x.pop('session_id'), i, X_sessions_ids)
            __add_to_dict(x.pop('user_id'), i, X_users_ids)
            _X.append(list(x.values()))

        Y_project_ids = dict()
        Y_users_ids = dict()
        Y_sessions_ids = dict()

        for i in range(len(Y[selection])):
            y = Y[selection][i]
            __add_to_dict(y.pop('project_id'), i, Y_project_ids)
            __add_to_dict(y.pop('session_id'), i, Y_sessions_ids)
            __add_to_dict(y.pop('user_id'), i, Y_users_ids)
            _Y.append(list(y.values()))

        return np.array(_X), np.array(_Y),\
               {'project_id': X_project_ids,
                'user_id': X_users_ids,
                'session_id': X_sessions_ids},\
               {'project_id': Y_project_ids,
                'user_id': Y_users_ids,
                'session_id': Y_sessions_ids}



