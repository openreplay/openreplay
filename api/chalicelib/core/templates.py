from chalicelib.utils import helper
from chalicelib.utils import pg_client

CATEGORY_DESCRIPTION = {
    'categ1': 'lorem',
}


def get_templates():
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT category, jsonb_agg(templates ORDER BY name) AS widgets
                        FROM templates
                        GROUP BY category
                        ORDER BY category;"""
        cur.execute(pg_query)
        rows = cur.fetchall()
    for r in rows:
        r["description"] = CATEGORY_DESCRIPTION.get(r["category"], "")
    return helper.list_to_camel_case(rows)
