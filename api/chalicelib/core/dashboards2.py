import json

import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client

CATEGORY_DESCRIPTION = {
    'categ1': 'lorem',
}


def get_templates(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        pg_query = cur.mogrify(f"""SELECT category, jsonb_agg(metrics ORDER BY name) AS widgets
                        FROM metrics
                        WHERE deleted_at IS NULL AND (project_id ISNULL OR (project_id = %(project_id)s AND (is_public OR user_id= %(userId)s)))  
                        GROUP BY category
                        ORDER BY category;""", {"project_id": project_id, "userId": user_id})
        cur.execute(pg_query)
        rows = cur.fetchall()
    for r in rows:
        r["description"] = CATEGORY_DESCRIPTION.get(r["category"], "")
    return helper.list_to_camel_case(rows)


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
        pg_query = """SELECT dashboards.*, all_metric_widgets.widgets AS widgets
                        FROM dashboards
                                 LEFT JOIN LATERAL (SELECT COALESCE(JSONB_AGG(raw_metrics), '[]') AS widgets
                                                    FROM (SELECT dashboard_widgets.*, metrics.*, metric_series.series
                                                          FROM metrics
                                                                   INNER JOIN dashboard_widgets USING (metric_id)
                                                                   LEFT JOIN LATERAL (SELECT JSONB_AGG(metric_series.* ORDER BY index) AS series
                                                                                      FROM metric_series
                                                                                      WHERE metric_series.metric_id = metrics.metric_id
                                                                                        AND metric_series.deleted_at ISNULL
                                                              ) AS metric_series ON (TRUE)
                                                          WHERE dashboard_widgets.dashboard_id = dashboards.dashboard_id
                                                            AND metrics.deleted_at ISNULL
                                                            AND metrics.project_id = %(projectId)s) AS raw_metrics
                            ) AS all_metric_widgets ON (TRUE)
                        WHERE dashboards.deleted_at ISNULL
                          AND dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public);"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id}
        print(cur.mogrify(pg_query, params))
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def delete_dashboard(project_id, user_id, dashboard_id):
    with pg_client.PostgresClient() as cur:
        pg_query = """UPDATE dashboards
                      SET deleted_at = timezone('utc'::text, now())
                        WHERE dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public);"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id}
        cur.execute(cur.mogrify(pg_query, params))
    return {"data": {"success": True}}


def update_dashboard(project_id, user_id, dashboard_id, data: schemas.CreateDashboardSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """UPDATE dashboards
                      SET name = %(name)s, is_pinned = %(is_pinned)s, is_public = %(is_public)s
                        WHERE dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public)
                      RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.dict()}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def add_widget(project_id, user_id, dashboard_id, data: schemas.AddWidgetToDashboardPayloadSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """INSERT INTO dashboard_widgets(dashboard_id, metric_id, user_id, config, name)
                          SELECT %(dashboard_id)s AS dashboard_id, %(metric_id)s AS metric_id, 
                                 %(userId)s AS user_id, %(config)s::jsonb AS config, %(name)s AS name
                          WHERE EXISTS(SELECT 1 FROM dashboards 
                                       WHERE dashboards.deleted_at ISNULL AND dashboards.project_id = %(projectId)s
                                          AND dashboard_id = %(dashboard_id)s
                                          AND (dashboards.user_id = %(userId)s OR is_public))
                      RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.dict()}
        params["config"] = json.dumps(data.config)
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def update_widget(project_id, user_id, dashboard_id, widget_id, data: schemas.AddWidgetToDashboardPayloadSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """UPDATE dashboard_widgets
                      SET name= %(name)s, config= %(config)s
                      WHERE dashboard_id=%(dashboard_id)s AND widget_id=%(widget_id)s
                      RETURNINIG *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id,
                  "widget_id": widget_id, **data.dict()}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def remove_widget(project_id, user_id, dashboard_id, widget_id):
    with pg_client.PostgresClient() as cur:
        pg_query = """DELETE FROM dashboard_widgets
                      WHERE dashboard_id=%(dashboard_id)s AND widget_id=%(widget_id)s;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, "widget_id": widget_id}
        cur.execute(cur.mogrify(pg_query, params))
    return {"data": {"success": True}}


def pin_dashboard(project_id, user_id, dashboard_id):
    with pg_client.PostgresClient() as cur:
        pg_query = """UPDATE dashboards
                      SET is_pinned = FALSE
                      WHERE dashboard_id=%(dashboard_id)s AND project_id=%(project_id)s;
                      UPDATE dashboards
                      SET is_pinned = True
                      WHERE dashboard_id=%(dashboard_id)s AND project_id=%(project_id)s AND deleted_at ISNULL
                      RETURNING *;"""
        params = {"userId": user_id, "project_id": project_id, "dashboard_id": dashboard_id}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)
