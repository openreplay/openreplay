import json
from typing import Union

import schemas
from chalicelib.core import sessions, funnels, errors, issues
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC

PIE_CHART_GROUP = 5


def __try_live(project_id, data: schemas.TryCustomMetricsPayloadSchema):
    results = []
    for i, s in enumerate(data.series):
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        results.append(sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                               view_type=data.view_type, metric_type=data.metric_type,
                                               metric_of=data.metric_of, metric_value=data.metric_value))
        if data.view_type == schemas.MetricTimeseriesViewType.progress:
            r = {"count": results[-1]}
            diff = s.filter.endDate - s.filter.startDate
            s.filter.endDate = s.filter.startDate
            s.filter.startDate = s.filter.endDate - diff
            r["previousCount"] = sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                                         view_type=data.view_type, metric_type=data.metric_type,
                                                         metric_of=data.metric_of, metric_value=data.metric_value)
            r["countProgress"] = helper.__progress(old_val=r["previousCount"], new_val=r["count"])
            # r["countProgress"] = ((r["count"] - r["previousCount"]) / r["previousCount"]) * 100 \
            #     if r["previousCount"] > 0 else 0
            r["seriesName"] = s.name if s.name else i + 1
            r["seriesId"] = s.series_id if s.series_id else None
            results[-1] = r
        elif data.view_type == schemas.MetricTableViewType.pie_chart:
            if len(results[i].get("values", [])) > PIE_CHART_GROUP:
                results[i]["values"] = results[i]["values"][:PIE_CHART_GROUP] \
                                       + [{
                    "name": "Others", "group": True,
                    "sessionCount": sum(r["sessionCount"] for r in results[i]["values"][PIE_CHART_GROUP:])
                }]

    return results


def __is_funnel_chart(data: schemas.TryCustomMetricsPayloadSchema):
    return data.metric_type == schemas.MetricType.funnel


def __get_funnel_chart(project_id, data: schemas.TryCustomMetricsPayloadSchema):
    if len(data.series) == 0:
        return {
            "stages": [],
            "totalDropDueToIssues": 0
        }
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    return funnels.get_top_insights_on_the_fly_widget(project_id=project_id, data=data.series[0].filter)


def __is_errors_list(data):
    return data.metric_type == schemas.MetricType.table \
           and data.metric_of == schemas.TableMetricOfType.errors


def __get_errors_list(project_id, user_id, data):
    if len(data.series) == 0:
        return {
            "total": 0,
            "errors": []
        }
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    data.series[0].filter.page = data.page
    data.series[0].filter.limit = data.limit
    return errors.search(data.series[0].filter, project_id=project_id, user_id=user_id)


def __is_sessions_list(data):
    return data.metric_type == schemas.MetricType.table \
           and data.metric_of == schemas.TableMetricOfType.sessions


def __get_sessions_list(project_id, user_id, data):
    if len(data.series) == 0:
        print("empty series")
        return {
            "total": 0,
            "sessions": []
        }
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    data.series[0].filter.page = data.page
    data.series[0].filter.limit = data.limit
    return sessions.search_sessions(data=data.series[0].filter, project_id=project_id, user_id=user_id)


def merged_live(project_id, data: schemas.TryCustomMetricsPayloadSchema, user_id=None):
    if __is_funnel_chart(data):
        return __get_funnel_chart(project_id=project_id, data=data)
    elif __is_errors_list(data):
        return __get_errors_list(project_id=project_id, user_id=user_id, data=data)
    elif __is_sessions_list(data):
        return __get_sessions_list(project_id=project_id, user_id=user_id, data=data)

    series_charts = __try_live(project_id=project_id, data=data)
    if data.view_type == schemas.MetricTimeseriesViewType.progress or data.metric_type == schemas.MetricType.table:
        return series_charts
    results = [{}] * len(series_charts[0])
    for i in range(len(results)):
        for j, series_chart in enumerate(series_charts):
            results[i] = {**results[i], "timestamp": series_chart[i]["timestamp"],
                          data.series[j].name if data.series[j].name else j + 1: series_chart[i]["count"]}
    return results


def __merge_metric_with_data(metric, data: Union[schemas.CustomMetricChartPayloadSchema,
                                                 schemas.CustomMetricSessionsPayloadSchema]) \
        -> Union[schemas.CreateCustomMetricsSchema, None]:
    if data.series is not None and len(data.series) > 0:
        metric["series"] = data.series
    metric: schemas.CreateCustomMetricsSchema = schemas.CreateCustomMetricsSchema.parse_obj({**data.dict(), **metric})
    if len(data.filters) > 0 or len(data.events) > 0:
        for s in metric.series:
            if len(data.filters) > 0:
                s.filter.filters += data.filters
            if len(data.events) > 0:
                s.filter.events += data.events
    return metric


def make_chart(project_id, user_id, metric_id, data: schemas.CustomMetricChartPayloadSchema, metric=None):
    if metric is None:
        metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas.CreateCustomMetricsSchema = __merge_metric_with_data(metric=metric, data=data)

    return merged_live(project_id=project_id, data=metric, user_id=user_id)
    # if __is_funnel_chart(metric):
    #     return __get_funnel_chart(project_id=project_id, data=metric)
    # elif __is_errors_list(metric):
    #     return __get_errors_list(project_id=project_id, user_id=user_id, data=metric)
    #
    # series_charts = __try_live(project_id=project_id, data=metric)
    # if metric.view_type == schemas.MetricTimeseriesViewType.progress or metric.metric_type == schemas.MetricType.table:
    #     return series_charts
    # results = [{}] * len(series_charts[0])
    # for i in range(len(results)):
    #     for j, series_chart in enumerate(series_charts):
    #         results[i] = {**results[i], "timestamp": series_chart[i]["timestamp"],
    #                       metric.series[j].name: series_chart[i]["count"]}
    # return results


def get_sessions(project_id, user_id, metric_id, data: schemas.CustomMetricSessionsPayloadSchema):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas.CreateCustomMetricsSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    results = []
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        results.append({"seriesId": s.series_id, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def get_funnel_issues(project_id, user_id, metric_id, data: schemas.CustomMetricSessionsPayloadSchema):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas.CreateCustomMetricsSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        return {"seriesId": s.series_id, "seriesName": s.name,
                **funnels.get_issues_on_the_fly_widget(project_id=project_id, data=s.filter)}


def get_errors_list(project_id, user_id, metric_id, data: schemas.CustomMetricSessionsPayloadSchema):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas.CreateCustomMetricsSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        return {"seriesId": s.series_id, "seriesName": s.name,
                **errors.search(data=s.filter, project_id=project_id, user_id=user_id)}


def try_sessions(project_id, user_id, data: schemas.CustomMetricSessionsPayloadSchema):
    results = []
    if data.series is None:
        return results
    for s in data.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        results.append({"seriesId": None, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def create(project_id, user_id, data: schemas.CreateCustomMetricsSchema, dashboard=False):
    with pg_client.PostgresClient() as cur:
        _data = {}
        for i, s in enumerate(data.series):
            for k in s.dict().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        data.series = None
        params = {"user_id": user_id, "project_id": project_id,
                  "default_config": json.dumps(data.config.dict()),
                  **data.dict(), **_data}
        query = cur.mogrify(f"""\
            WITH m AS (INSERT INTO metrics (project_id, user_id, name, is_public,
                                    view_type, metric_type, metric_of, metric_value,
                                    metric_format, default_config)
                         VALUES (%(project_id)s, %(user_id)s, %(name)s, %(is_public)s, 
                                    %(view_type)s, %(metric_type)s, %(metric_of)s, %(metric_value)s, 
                                    %(metric_format)s, %(default_config)s)
                         RETURNING *)
            INSERT
            INTO metric_series(metric_id, index, name, filter)
            VALUES {",".join([f"((SELECT metric_id FROM m), %(index_{i})s, %(name_{i})s, %(filter_{i})s::jsonb)"
                              for i in range(series_len)])}
            RETURNING metric_id;""", params)

        cur.execute(
            query
        )
        r = cur.fetchone()
        if dashboard:
            return r["metric_id"]
    return {"data": get(metric_id=r["metric_id"], project_id=project_id, user_id=user_id)}


def update(metric_id, user_id, project_id, data: schemas.UpdateCustomMetricsSchema):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    series_ids = [r["seriesId"] for r in metric["series"]]
    n_series = []
    d_series_ids = []
    u_series = []
    u_series_ids = []
    params = {"metric_id": metric_id, "is_public": data.is_public, "name": data.name,
              "user_id": user_id, "project_id": project_id, "view_type": data.view_type,
              "metric_type": data.metric_type, "metric_of": data.metric_of,
              "metric_value": data.metric_value, "metric_format": data.metric_format}
    for i, s in enumerate(data.series):
        prefix = "u_"
        if s.index is None:
            s.index = i
        if s.series_id is None or s.series_id not in series_ids:
            n_series.append({"i": i, "s": s})
            prefix = "n_"
        else:
            u_series.append({"i": i, "s": s})
            u_series_ids.append(s.series_id)
        ns = s.dict()
        for k in ns.keys():
            if k == "filter":
                ns[k] = json.dumps(ns[k])
            params[f"{prefix}{k}_{i}"] = ns[k]
    for i in series_ids:
        if i not in u_series_ids:
            d_series_ids.append(i)
    params["d_series_ids"] = tuple(d_series_ids)

    with pg_client.PostgresClient() as cur:
        sub_queries = []
        if len(n_series) > 0:
            sub_queries.append(f"""\
            n AS (INSERT INTO metric_series (metric_id, index, name, filter)
                 VALUES {",".join([f"(%(metric_id)s, %(n_index_{s['i']})s, %(n_name_{s['i']})s, %(n_filter_{s['i']})s::jsonb)"
                                   for s in n_series])}
                 RETURNING 1)""")
        if len(u_series) > 0:
            sub_queries.append(f"""\
            u AS (UPDATE metric_series
                    SET name=series.name,
                        filter=series.filter,
                        index=series.index
                    FROM (VALUES {",".join([f"(%(u_series_id_{s['i']})s,%(u_index_{s['i']})s,%(u_name_{s['i']})s,%(u_filter_{s['i']})s::jsonb)"
                                            for s in u_series])}) AS series(series_id, index, name, filter)
                    WHERE metric_series.metric_id =%(metric_id)s AND metric_series.series_id=series.series_id
                 RETURNING 1)""")
        if len(d_series_ids) > 0:
            sub_queries.append("""\
            d AS (DELETE FROM metric_series WHERE metric_id =%(metric_id)s AND series_id IN %(d_series_ids)s
                 RETURNING 1)""")
        query = cur.mogrify(f"""\
            {"WITH " if len(sub_queries) > 0 else ""}{",".join(sub_queries)}
            UPDATE metrics
            SET name = %(name)s, is_public= %(is_public)s, 
                view_type= %(view_type)s, metric_type= %(metric_type)s, 
                metric_of= %(metric_of)s, metric_value= %(metric_value)s,
                metric_format= %(metric_format)s,
                edited_at = timezone('utc'::text, now())
            WHERE metric_id = %(metric_id)s
            AND project_id = %(project_id)s 
            AND (user_id = %(user_id)s OR is_public) 
            RETURNING metric_id;""", params)
        cur.execute(query)
    return get(metric_id=metric_id, project_id=project_id, user_id=user_id)


def get_all(project_id, user_id, include_series=False):
    with pg_client.PostgresClient() as cur:
        sub_join = ""
        if include_series:
            sub_join = """LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index),'[]'::jsonb) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)"""
        cur.execute(
            cur.mogrify(
                f"""SELECT *
                    FROM metrics
                             {sub_join}
                             LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(connected_dashboards.* ORDER BY is_public,name),'[]'::jsonb) AS dashboards
                                                FROM (SELECT DISTINCT dashboard_id, name, is_public
                                                      FROM dashboards INNER JOIN dashboard_widgets USING (dashboard_id)
                                                      WHERE deleted_at ISNULL
                                                        AND dashboard_widgets.metric_id = metrics.metric_id
                                                        AND project_id = %(project_id)s
                                                        AND ((dashboards.user_id = %(user_id)s OR is_public))) AS connected_dashboards
                                                ) AS connected_dashboards ON (TRUE)
                             LEFT JOIN LATERAL (SELECT email AS owner_email
                                                FROM users
                                                WHERE deleted_at ISNULL
                                                  AND users.user_id = metrics.user_id
                                                ) AS owner ON (TRUE)
                    WHERE metrics.project_id = %(project_id)s
                      AND metrics.deleted_at ISNULL
                      AND (user_id = %(user_id)s OR metrics.is_public)
                    ORDER BY metrics.edited_at DESC, metrics.created_at DESC;""",
                {"project_id": project_id, "user_id": user_id}
            )
        )
        rows = cur.fetchall()
        if include_series:
            for r in rows:
                # r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
                for s in r["series"]:
                    s["filter"] = helper.old_search_payload_to_flat(s["filter"])
        else:
            for r in rows:
                r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
                r["edited_at"] = TimeUTC.datetime_to_timestamp(r["edited_at"])
        rows = helper.list_to_camel_case(rows)
    return rows


def delete(project_id, metric_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET deleted_at = timezone('utc'::text, now()), edited_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public);""",
                        {"metric_id": metric_id, "project_id": project_id, "user_id": user_id})
        )

    return {"state": "success"}


def get(metric_id, project_id, user_id, flatten=True):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT *
                    FROM metrics
                             LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index),'[]'::jsonb) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)
                             LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(connected_dashboards.* ORDER BY is_public,name),'[]'::jsonb) AS dashboards
                                                FROM (SELECT dashboard_id, name, is_public
                                                      FROM dashboards
                                                      WHERE deleted_at ISNULL
                                                        AND project_id = %(project_id)s
                                                        AND ((user_id = %(user_id)s OR is_public))) AS connected_dashboards
                                                ) AS connected_dashboards ON (TRUE)
                             LEFT JOIN LATERAL (SELECT email AS owner_email
                                                FROM users
                                                WHERE deleted_at ISNULL
                                                AND users.user_id = metrics.user_id
                                                ) AS owner ON (TRUE)
                    WHERE metrics.project_id = %(project_id)s
                      AND metrics.deleted_at ISNULL
                      AND (metrics.user_id = %(user_id)s OR metrics.is_public)
                      AND metrics.metric_id = %(metric_id)s
                    ORDER BY created_at;""",
                {"metric_id": metric_id, "project_id": project_id, "user_id": user_id}
            )
        )
        row = cur.fetchone()
        if row is None:
            return None
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        row["edited_at"] = TimeUTC.datetime_to_timestamp(row["edited_at"])
        if flatten:
            for s in row["series"]:
                s["filter"] = helper.old_search_payload_to_flat(s["filter"])
    return helper.dict_to_camel_case(row)


def get_with_template(metric_id, project_id, user_id, include_dashboard=True):
    with pg_client.PostgresClient() as cur:
        sub_query = ""
        if include_dashboard:
            sub_query = """LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(connected_dashboards.* ORDER BY is_public,name),'[]'::jsonb) AS dashboards
                                                FROM (SELECT dashboard_id, name, is_public
                                                      FROM dashboards
                                                      WHERE deleted_at ISNULL
                                                        AND project_id = %(project_id)s
                                                        AND ((user_id = %(user_id)s OR is_public))) AS connected_dashboards
                                                ) AS connected_dashboards ON (TRUE)"""
        cur.execute(
            cur.mogrify(
                f"""SELECT *
                    FROM metrics
                             LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index),'[]'::jsonb) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)
                             {sub_query}
                    WHERE (metrics.project_id = %(project_id)s OR metrics.project_id ISNULL)
                      AND metrics.deleted_at ISNULL
                      AND (metrics.user_id = %(user_id)s OR metrics.is_public)
                      AND metrics.metric_id = %(metric_id)s
                    ORDER BY created_at;""",
                {"metric_id": metric_id, "project_id": project_id, "user_id": user_id}
            )
        )
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def get_series_for_alert(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT series_id AS value,
                       metrics.name || '.' || (COALESCE(metric_series.name, 'series ' || index)) || '.count' AS name,
                       'count' AS unit,
                       FALSE AS predefined,
                       metric_id,
                       series_id
                    FROM metric_series
                             INNER JOIN metrics USING (metric_id)
                    WHERE metrics.deleted_at ISNULL
                      AND metrics.project_id = %(project_id)s
                      AND metrics.metric_type = 'timeseries'
                      AND (user_id = %(user_id)s OR is_public)
                    ORDER BY name;""",
                {"project_id": project_id, "user_id": user_id}
            )
        )
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def change_state(project_id, metric_id, user_id, status):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET active = %(status)s 
            WHERE metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public);""",
                        {"metric_id": metric_id, "status": status, "user_id": user_id})
        )
    return get(metric_id=metric_id, project_id=project_id, user_id=user_id)


def get_funnel_sessions_by_issue(user_id, project_id, metric_id, issue_id,
                                 data: schemas.CustomMetricSessionsPayloadSchema
                                 # , range_value=None, start_date=None, end_date=None
                                 ):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas.CreateCustomMetricsSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        issues_list = funnels.get_issues_on_the_fly_widget(project_id=project_id, data=s.filter).get("issues", {})
        issues_list = issues_list.get("significant", []) + issues_list.get("insignificant", [])
        issue = None
        for i in issues_list:
            if i.get("issueId", "") == issue_id:
                issue = i
                break
        if issue is None:
            issue = issues.get(project_id=project_id, issue_id=issue_id)
            if issue is not None:
                issue = {**issue,
                         "affectedSessions": 0,
                         "affectedUsers": 0,
                         "conversionImpact": 0,
                         "lostConversions": 0,
                         "unaffectedSessions": 0}
        return {"seriesId": s.series_id, "seriesName": s.name,
                "sessions": sessions.search_sessions(user_id=user_id, project_id=project_id,
                                                     issue=issue, data=s.filter)
                if issue is not None else {"total": 0, "sessions": []},
                "issue": issue}
