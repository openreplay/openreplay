import json

import schemas
from chalicelib.core import custom_metrics
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC

from decouple import config

if config("EXP_METRICS", cast=bool, default=False):
    from . import metrics_exp as metrics
else:
    from . import metrics as metrics

# category name should be lower cased
CATEGORY_DESCRIPTION = {
    'web vitals': 'A set of metrics that assess app performance on criteria such as load time, load performance, and stability.',
    'custom': 'Previously created custom metrics by me and my team.',
    'errors': 'Keep a closer eye on errors and track their type, origin and domain.',
    'performance': 'Optimize your app’s performance by tracking slow domains, page response times, memory consumption, CPU usage and more.',
    'resources': 'Find out which resources are missing and those that may be slowing your web app.'
}


def get_templates(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        pg_query = cur.mogrify(f"""SELECT category, jsonb_agg(metrics ORDER BY name) AS widgets
                        FROM (SELECT * , default_config AS config
                              FROM metrics LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index), '[]'::jsonb) AS series
                                                              FROM metric_series
                                                              WHERE metric_series.metric_id = metrics.metric_id
                                                                AND metric_series.deleted_at ISNULL
                                                            ) AS metric_series ON (TRUE)
                              WHERE deleted_at IS NULL 
                                    AND (project_id ISNULL OR (project_id = %(project_id)s AND (is_public OR user_id= %(userId)s)))
                            ) AS metrics  
                        GROUP BY category
                        ORDER BY ARRAY_POSITION(ARRAY ['custom','overview','errors','performance','resources'], category);""",
                               {"project_id": project_id, "userId": user_id})
        cur.execute(pg_query)
        rows = cur.fetchall()
    for r in rows:
        r["description"] = CATEGORY_DESCRIPTION.get(r["category"].lower(), "")
        for w in r["widgets"]:
            w["created_at"] = TimeUTC.datetime_to_timestamp(w["created_at"])
            w["edited_at"] = TimeUTC.datetime_to_timestamp(w["edited_at"])
            for s in w["series"]:
                s["filter"] = helper.old_search_payload_to_flat(s["filter"])

    return helper.list_to_camel_case(rows)


def create_dashboard(project_id, user_id, data: schemas.CreateDashboardSchema):
    with pg_client.PostgresClient() as cur:
        pg_query = f"""INSERT INTO dashboards(project_id, user_id, name, is_public, is_pinned, description) 
                        VALUES(%(projectId)s, %(userId)s, %(name)s, %(is_public)s, %(is_pinned)s, %(description)s)
                        RETURNING *"""
        params = {"userId": user_id, "projectId": project_id, **data.dict()}
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
                                                    FROM (SELECT dashboard_widgets.*, metrics.*, metric_series.series
                                                          FROM metrics
                                                                   INNER JOIN dashboard_widgets USING (metric_id)
                                                                   LEFT JOIN LATERAL (SELECT COALESCE(JSONB_AGG(metric_series.* ORDER BY index),'[]') AS series
                                                                                      FROM metric_series
                                                                                      WHERE metric_series.metric_id = metrics.metric_id
                                                                                        AND metric_series.deleted_at ISNULL
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
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.dict()}
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
                          AND (dashboards.user_id = %(userId)s OR is_public)"""
        if data.metrics is not None and len(data.metrics) > 0:
            pg_query = f"""WITH dash AS ({pg_query})
                         INSERT INTO dashboard_widgets(dashboard_id, metric_id, user_id, config)
                         VALUES {",".join([f"(%(dashboard_id)s, %(metric_id_{i})s, %(userId)s, (SELECT default_config FROM metrics WHERE metric_id=%(metric_id_{i})s)||%(config_{i})s)" for i in range(len(data.metrics))])};"""
            for i, m in enumerate(data.metrics):
                params[f"metric_id_{i}"] = m
                # params[f"config_{i}"] = schemas.AddWidgetToDashboardPayloadSchema.schema() \
                #     .get("properties", {}).get("config", {}).get("default", {})
                # params[f"config_{i}"]["position"] = i
                # params[f"config_{i}"] = json.dumps(params[f"config_{i}"])
                params[f"config_{i}"] = json.dumps({"position": i + offset})

        cur.execute(cur.mogrify(pg_query, params))

    return get_dashboard(project_id=project_id, user_id=user_id, dashboard_id=dashboard_id)


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
        params = {"userId": user_id, "projectId": project_id, "dashboard_id": dashboard_id, **data.dict()}
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
                  "widget_id": widget_id, **data.dict()}
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


def create_metric_add_widget(project_id, user_id, dashboard_id, data: schemas.CreateCustomMetricsSchema):
    metric_id = custom_metrics.create(project_id=project_id, user_id=user_id, data=data, dashboard=True)
    return add_widget(project_id=project_id, user_id=user_id, dashboard_id=dashboard_id,
                      data=schemas.AddWidgetToDashboardPayloadSchema(metricId=metric_id))


PREDEFINED = {schemas.TemplatePredefinedKeys.count_sessions: metrics.get_processed_sessions,
              schemas.TemplatePredefinedKeys.avg_image_load_time: metrics.get_application_activity_avg_image_load_time,
              schemas.TemplatePredefinedKeys.avg_page_load_time: metrics.get_application_activity_avg_page_load_time,
              schemas.TemplatePredefinedKeys.avg_request_load_time: metrics.get_application_activity_avg_request_load_time,
              schemas.TemplatePredefinedKeys.avg_dom_content_load_start: metrics.get_page_metrics_avg_dom_content_load_start,
              schemas.TemplatePredefinedKeys.avg_first_contentful_pixel: metrics.get_page_metrics_avg_first_contentful_pixel,
              schemas.TemplatePredefinedKeys.avg_visited_pages: metrics.get_user_activity_avg_visited_pages,
              schemas.TemplatePredefinedKeys.avg_session_duration: metrics.get_user_activity_avg_session_duration,
              schemas.TemplatePredefinedKeys.avg_pages_dom_buildtime: metrics.get_pages_dom_build_time,
              schemas.TemplatePredefinedKeys.avg_pages_response_time: metrics.get_pages_response_time,
              schemas.TemplatePredefinedKeys.avg_response_time: metrics.get_top_metrics_avg_response_time,
              schemas.TemplatePredefinedKeys.avg_first_paint: metrics.get_top_metrics_avg_first_paint,
              schemas.TemplatePredefinedKeys.avg_dom_content_loaded: metrics.get_top_metrics_avg_dom_content_loaded,
              schemas.TemplatePredefinedKeys.avg_till_first_bit: metrics.get_top_metrics_avg_till_first_bit,
              schemas.TemplatePredefinedKeys.avg_time_to_interactive: metrics.get_top_metrics_avg_time_to_interactive,
              schemas.TemplatePredefinedKeys.count_requests: metrics.get_top_metrics_count_requests,
              schemas.TemplatePredefinedKeys.avg_time_to_render: metrics.get_time_to_render,
              schemas.TemplatePredefinedKeys.avg_used_js_heap_size: metrics.get_memory_consumption,
              schemas.TemplatePredefinedKeys.avg_cpu: metrics.get_avg_cpu,
              schemas.TemplatePredefinedKeys.avg_fps: metrics.get_avg_fps,
              schemas.TemplatePredefinedKeys.impacted_sessions_by_js_errors: metrics.get_impacted_sessions_by_js_errors,
              schemas.TemplatePredefinedKeys.domains_errors_4xx: metrics.get_domains_errors_4xx,
              schemas.TemplatePredefinedKeys.domains_errors_5xx: metrics.get_domains_errors_5xx,
              schemas.TemplatePredefinedKeys.errors_per_domains: metrics.get_errors_per_domains,
              schemas.TemplatePredefinedKeys.calls_errors: metrics.get_calls_errors,
              schemas.TemplatePredefinedKeys.errors_by_type: metrics.get_errors_per_type,
              schemas.TemplatePredefinedKeys.errors_by_origin: metrics.get_resources_by_party,
              schemas.TemplatePredefinedKeys.speed_index_by_location: metrics.get_speed_index_location,
              schemas.TemplatePredefinedKeys.slowest_domains: metrics.get_slowest_domains,
              schemas.TemplatePredefinedKeys.sessions_per_browser: metrics.get_sessions_per_browser,
              schemas.TemplatePredefinedKeys.time_to_render: metrics.get_time_to_render,
              schemas.TemplatePredefinedKeys.impacted_sessions_by_slow_pages: metrics.get_impacted_sessions_by_slow_pages,
              schemas.TemplatePredefinedKeys.memory_consumption: metrics.get_memory_consumption,
              schemas.TemplatePredefinedKeys.cpu_load: metrics.get_avg_cpu,
              schemas.TemplatePredefinedKeys.frame_rate: metrics.get_avg_fps,
              schemas.TemplatePredefinedKeys.crashes: metrics.get_crashes,
              schemas.TemplatePredefinedKeys.resources_vs_visually_complete: metrics.get_resources_vs_visually_complete,
              schemas.TemplatePredefinedKeys.pages_dom_buildtime: metrics.get_pages_dom_build_time,
              schemas.TemplatePredefinedKeys.pages_response_time: metrics.get_pages_response_time,
              schemas.TemplatePredefinedKeys.pages_response_time_distribution: metrics.get_pages_response_time_distribution,
              schemas.TemplatePredefinedKeys.missing_resources: metrics.get_missing_resources_trend,
              schemas.TemplatePredefinedKeys.slowest_resources: metrics.get_slowest_resources,
              schemas.TemplatePredefinedKeys.resources_fetch_time: metrics.get_resources_loading_time,
              schemas.TemplatePredefinedKeys.resource_type_vs_response_end: metrics.resource_type_vs_response_end,
              schemas.TemplatePredefinedKeys.resources_count_by_type: metrics.get_resources_count_by_type,
              }


def get_predefined_metric(key: schemas.TemplatePredefinedKeys, project_id: int, data: dict):
    return PREDEFINED.get(key, lambda *args: None)(project_id=project_id, **data)


def make_chart_metrics(project_id, user_id, metric_id, data: schemas.CustomMetricChartPayloadSchema):
    raw_metric = custom_metrics.get_with_template(metric_id=metric_id, project_id=project_id, user_id=user_id,
                                                  include_dashboard=False)
    if raw_metric is None:
        return None
    metric: schemas.CustomMetricAndTemplate = schemas.CustomMetricAndTemplate.parse_obj(raw_metric)
    if metric.is_template and metric.predefined_key is None:
        return None
    if metric.is_template:
        return get_predefined_metric(key=metric.predefined_key, project_id=project_id, data=data.dict())
    else:
        return custom_metrics.make_chart(project_id=project_id, user_id=user_id, metric_id=metric_id, data=data,
                                         metric=raw_metric)


def make_chart_widget(dashboard_id, project_id, user_id, widget_id, data: schemas.CustomMetricChartPayloadSchema):
    raw_metric = get_widget(widget_id=widget_id, project_id=project_id, user_id=user_id, dashboard_id=dashboard_id)
    if raw_metric is None:
        return None
    metric = schemas.CustomMetricAndTemplate = schemas.CustomMetricAndTemplate.parse_obj(raw_metric)
    if metric.is_template:
        return get_predefined_metric(key=metric.predefined_key, project_id=project_id, data=data.dict())
    else:
        return custom_metrics.make_chart(project_id=project_id, user_id=user_id, metric_id=raw_metric["metricId"],
                                         data=data, metric=raw_metric)
