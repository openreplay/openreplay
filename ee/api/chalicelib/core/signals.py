import json

import schemas_ee
from chalicelib.utils import helper
from chalicelib.utils import pg_client


def handle_frontend_signals(project_id: int, user_id: str, data: schemas_ee.SignalsSchema):
    res = {'errors': 'query not executed'}
    insights_query = """INSERT INTO public.frontend_signals VALUES ({project_id}, {user_id}, {timestamp}, {action}, {source}, {category}, {data})"""
    with pg_client.PostgresClient() as conn:
        query = conn.mogrify(insights_query, {'project_id': project_id, 'user_id': user_id, 'timestamp': data['timestamp'], 'source': data['source'],
                                      'category': data['category'], 'data': json.dumps(data['data'])})
        conn.execute(query)
        res = helper.dict_to_camel_case(conn.fetchone())
    return res
