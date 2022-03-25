import json

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
        pg_query = """SELECT dashboards.*, all_template_widgets.widgets AS template_widgets, all_metric_widgets.widgets AS metric_widgets
                        FROM dashboards
                                 LEFT JOIN LATERAL (SELECT COALESCE(JSONB_AGG(templates), '[]'::jsonb) AS widgets
                                                    FROM templates
                                                             INNER JOIN dashboard_widgets USING (template_id)
                                                    WHERE dashboard_widgets.dashboard_id = dashboards.dashboard_id
                            ) AS all_template_widgets ON (TRUE)
                                 LEFT JOIN LATERAL (SELECT COALESCE(JSONB_AGG(raw_metrics), '[]') AS widgets
                                                    FROM (SELECT metrics.*, metric_series.series
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
        row["widgets"] = row.pop("template_widgets") + row.pop("metric_widgets")
    return helper.dict_to_camel_case(row)


def add_widget(project_id, user_id, dashboard_id, data: schemas.AddWidgetToDashboardPayloadSchema):
    ref_key = "metric_id"
    if data.template_id is not None:
        ref_key = "template_id"
    with pg_client.PostgresClient() as cur:
        pg_query = f"""INSERT INTO dashboard_widgets(dashboard_id, {ref_key}, user_id, configuration, name)
                      VALUES (%(dashboard_id)s, %({ref_key})s, %(userId)s, %(configuration)s::jsonb, %(name)s)
                      RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.dict()}
        params["configuration"] = json.dumps(params.get("configuration", {}))
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)

# def get_widgets(project_id):
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT *
#                         FROM widgets
#                         WHERE deleted_at ISNULL
#                           AND project_id = %(projectId)s;"""
#         params = {"projectId": project_id}
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#     return helper.list_to_camel_case(rows)
