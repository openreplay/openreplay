import json

import schemas
from chalicelib.core import custom_metrics
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def create_dashboard(project_id, user_id, data: schemas.CreateDashboardSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = f"""INSERT INTO dashboards(project_id, user_id, name, is_public, is_pinned, description) 
                        VALUES(%(projectId)s, %(userId)s, %(name)s, %(is_public)s, %(is_pinned)s, %(description)s)
                        RETURNING *"""
        params = {"userId": user_id, "projectId": project_id, **data.model_dump()}
        if data.metrics is not None and len(data.metrics) > 0:
            pg_query = f"""WITH dash AS ({pg_query})
                         INSERT INTO dashboard_widgets(dashboard_id, metric_id, user_id, config)
                         VALUES {",".join([f"((SELECT dashboard_id FROM dash),%(metric_id_{i})s, %(userId)s, (SELECT default_config FROM metrics WHERE metric_id=%(metric_id_{i})s)||%(config_{i})s)" for i in range(len(data.metrics))])}
                         RETURNING (SELECT dashboard_id FROM dash)"""
            for i, m in enumerate(data.metrics):
                params[f"metric_id_{i}"] = m
                # params[f"config_{i}"] = schemas.AddWidgetToDashboardPayloadSchema.schema() \
                #     .get("properties", {}).get("config", {}).get("default", {})
                # params[f"config_{i}"]["position"] = i
                # params[f"config_{i}"] = json.dumps(params[f"config_{i}"])
                params[f"config_{i}"] = json.dumps({"position": i})
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    if row is None:
        return {"errors": ["something went wrong while creating the dashboard"]}
    return {"data": get_dashboard(project_id=project_id, user_id=user_id, dashboard_id=row["dashboard_id"])}


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
                                                    FROM (SELECT dashboard_widgets.*, 
                                                                 metrics.name, metrics.edited_at,metrics.metric_of,
                                                                 metrics.view_type,metrics.thumbnail,metrics.metric_type,
                                                                 metrics.metric_format,metrics.metric_value,metrics.default_config,
                                                                 metric_series.series
                                                          FROM metrics
                                                               INNER JOIN dashboard_widgets USING (metric_id)
                                                               LEFT JOIN LATERAL (
                                                                      SELECT COALESCE(JSONB_AGG(metric_series.* ORDER BY index),'[]') AS series
                                                                      FROM (SELECT metric_series.name, 
                                                                                   metric_series.index, 
                                                                                   metric_series.metric_id,
                                                                                   metric_series.series_id, 
                                                                                   metric_series.created_at
                                                                            FROM metric_series
                                                                            WHERE metric_series.metric_id = metrics.metric_id
                                                                              AND metric_series.deleted_at ISNULL) AS metric_series
                                                              ) AS metric_series ON (TRUE)
                                                          WHERE dashboard_widgets.dashboard_id = dashboards.dashboard_id
                                                            AND metrics.deleted_at ISNULL
                                                            AND (metrics.project_id = %(projectId)s OR metrics.project_id ISNULL)) AS raw_metrics
                            ) AS all_metric_widgets ON (TRUE)
                        WHERE dashboards.deleted_at ISNULL
                          AND dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public);"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
        if row is not None:
            row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
            for w in row["widgets"]:
                w["created_at"] = TimeUTC.datetime_to_timestamp(w["created_at"])
                w["edited_at"] = TimeUTC.datetime_to_timestamp(w["edited_at"])
                w["config"]["col"] = w["default_config"]["col"]
                w["config"]["row"] = w["default_config"]["row"]
                w.pop("default_config")
                for s in w["series"]:
                    s["created_at"] = TimeUTC.datetime_to_timestamp(s["created_at"])
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


def update_dashboard(project_id, user_id, dashboard_id, data: schemas.EditDashboardSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """SELECT COALESCE(COUNT(*),0) AS count
                    FROM dashboard_widgets
                    WHERE dashboard_id = %(dashboard_id)s;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.model_dump()}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
        offset = row["count"]
        pg_query = f"""UPDATE dashboards
                       SET name = %(name)s,
                          description= %(description)s
                            {", is_public = %(is_public)s" if data.is_public is not None else ""}
                            {", is_pinned = %(is_pinned)s" if data.is_pinned is not None else ""}
                       WHERE dashboards.project_id = %(projectId)s
                          AND dashboard_id = %(dashboard_id)s
                          AND (dashboards.user_id = %(userId)s OR is_public)
                       RETURNING dashboard_id,name,description,is_public,created_at"""
        if data.metrics is not None and len(data.metrics) > 0:
            pg_query = f"""WITH dash AS ({pg_query})
                           INSERT INTO dashboard_widgets(dashboard_id, metric_id, user_id, config)
                           VALUES {",".join([f"(%(dashboard_id)s, %(metric_id_{i})s, %(userId)s, (SELECT default_config FROM metrics WHERE metric_id=%(metric_id_{i})s)||%(config_{i})s)" for i in range(len(data.metrics))])}
                           RETURNING (SELECT dashboard_id FROM dash),(SELECT name FROM dash),
                                     (SELECT description FROM dash),(SELECT is_public FROM dash),
                                     (SELECT created_at FROM dash);"""
            for i, m in enumerate(data.metrics):
                params[f"metric_id_{i}"] = m
                # params[f"config_{i}"] = schemas.AddWidgetToDashboardPayloadSchema.schema() \
                #     .get("properties", {}).get("config", {}).get("default", {})
                # params[f"config_{i}"]["position"] = i
                # params[f"config_{i}"] = json.dumps(params[f"config_{i}"])
                params[f"config_{i}"] = json.dumps({"position": i + offset})

        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
        if row:
            row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    return helper.dict_to_camel_case(row)


def get_widget(project_id, user_id, dashboard_id, widget_id):
    with pg_client.PostgresClient() as cur:
        pg_query = """SELECT metrics.*, metric_series.series
                        FROM dashboard_widgets
                                 INNER JOIN dashboards USING (dashboard_id)
                                 INNER JOIN metrics USING (metric_id)
                                 LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index), '[]'::jsonb) AS series
                                                    FROM metric_series
                                                    WHERE metric_series.metric_id = metrics.metric_id
                                                      AND metric_series.deleted_at ISNULL
                            ) AS metric_series ON (TRUE)
                        WHERE dashboard_id = %(dashboard_id)s
                          AND widget_id = %(widget_id)s
                          AND (dashboards.is_public OR dashboards.user_id = %(userId)s)
                          AND dashboards.deleted_at IS NULL
                          AND metrics.deleted_at ISNULL
                          AND (metrics.project_id = %(projectId)s OR metrics.project_id ISNULL)
                          AND (metrics.is_public OR metrics.user_id = %(userId)s);"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, "widget_id": widget_id}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def add_widget(project_id, user_id, dashboard_id, data: schemas.AddWidgetToDashboardPayloadSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """INSERT INTO dashboard_widgets(dashboard_id, metric_id, user_id, config)
                          SELECT %(dashboard_id)s AS dashboard_id, %(metric_id)s AS metric_id, 
                                 %(userId)s AS user_id, (SELECT default_config FROM metrics WHERE metric_id=%(metric_id)s)||%(config)s::jsonb AS config
                          WHERE EXISTS(SELECT 1 FROM dashboards 
                                       WHERE dashboards.deleted_at ISNULL AND dashboards.project_id = %(projectId)s
                                          AND dashboard_id = %(dashboard_id)s
                                          AND (dashboards.user_id = %(userId)s OR is_public))
                      RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.model_dump()}
        params["config"] = json.dumps(data.config)
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def update_widget(project_id, user_id, dashboard_id, widget_id, data: schemas.UpdateWidgetPayloadSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = """UPDATE dashboard_widgets
                      SET config= %(config)s
                      WHERE dashboard_id=%(dashboard_id)s AND widget_id=%(widget_id)s
                      RETURNING *;"""
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id,
                  "widget_id": widget_id, **data.model_dump()}
        params["config"] = json.dumps(data.config)
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
                      WHERE project_id=%(project_id)s;
                      UPDATE dashboards
                      SET is_pinned = True
                      WHERE dashboard_id=%(dashboard_id)s AND project_id=%(project_id)s AND deleted_at ISNULL
                      RETURNING *;"""
        params = {"userId": user_id, "project_id": project_id, "dashboard_id": dashboard_id}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def create_metric_add_widget(project_id, user_id, dashboard_id, data: schemas.CardSchema):
    metric_id = custom_metrics.create_card(project_id=project_id, user_id=user_id, data=data, dashboard=True)
    return add_widget(project_id=project_id, user_id=user_id, dashboard_id=dashboard_id,
                      data=schemas.AddWidgetToDashboardPayloadSchema(metricId=metric_id))

# def make_chart_widget(dashboard_id, project_id, user_id, widget_id, data: schemas.CardChartSchema):
#     raw_metric = get_widget(widget_id=widget_id, project_id=project_id, user_id=user_id, dashboard_id=dashboard_id)
#     if raw_metric is None:
#         return None
#     metric = schemas.CustomMetricAndTemplate = schemas.CustomMetricAndTemplate(**raw_metric)
#     if metric.is_template:
#         return get_predefined_metric(key=metric.predefined_key, project_id=project_id, data=data.model_dump())
#     else:
#         return custom_metrics.make_chart(project_id=project_id, user_id=user_id, metric_id=raw_metric["metricId"],
#                                          data=data, metric=raw_metric)
