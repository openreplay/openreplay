from chalicelib.utils import helper
from chalicelib.utils import pg_client

CATEGORY_DESCRIPTION = {
    'categ1': 'lorem',
}


def get_templates(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        pg_query = cur.mogrify(f"""SELECT category, jsonb_agg(metrics ORDER BY name) AS widgets
                        FROM metrics
                        WHERE project_id ISNULL OR (project_id = %(project_id)s AND (is_public OR user_id= %(userId)s))  
                        GROUP BY category
                        ORDER BY category;""", {"project_id": project_id, "userId": user_id})
        cur.execute(pg_query)
        rows = cur.fetchall()
    for r in rows:
        r["description"] = CATEGORY_DESCRIPTION.get(r["category"], "")
    return helper.list_to_camel_case(rows)
