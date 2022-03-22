import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client


def create_dashboard(project_id, user_id, data: schemas.CreateDashboardSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = f"""INSERT INTO dashboards(project_id, user_id, name, is_public, is_pinned) 
                        VALUES(%(projectId)s, %(userId)s, %(name)s, %(is_public)s, %(is_pinned)s)
                        RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, **data.dict()}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def get_dashboards(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT *
                        FROM dashboards
                        WHERE deleted_at ISNULL
                          AND project_id = %(projectId)s
                          AND (user_id = %(userId)s OR is_public);"""
        params = {"userId": user_id, "projectId": project_id}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def get_dashboard(project_id, user_id, dashboard_id):
    with pg_client.PostgresClient() as cur:
        pg_query = """SELECT dashboards.*, all_widgets.*
                        FROM dashboards
                                 LEFT JOIN LATERAL (SELECT COALESCE(ARRAY_AGG(widgets), '{}') AS widgets
                                                    FROM widgets
                                                             INNER JOIN dashboard_widgets USING (widget_id)
                                                    WHERE dashboard_widgets.dashboard_id = dashboards.dashboard_id
                                                      AND widgets.deleted_at ISNULL
                                                      AND (widgets.project_id ISNULL OR widgets.project_id = %(projectId)s)
                            ) AS all_widgets ON (TRUE)
                        WHERE dashboards.deleted_at ISNULL
                          AND dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public);"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def get_widgets(project_id):
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT *
                        FROM widgets
                        WHERE deleted_at ISNULL
                          AND project_id = %(projectId)s;"""
        params = {"projectId": project_id}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)
