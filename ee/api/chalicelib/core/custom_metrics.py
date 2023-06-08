import json
from typing import Union

from decouple import config
from fastapi import HTTPException, status

import schemas
import schemas_ee
from chalicelib.core import funnels, issues, metrics, click_maps, sessions_insights, sessions_mobs, sessions_favorite
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.storage import StorageClient, extra

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    print(">>> Using experimental error search")
    from . import errors_exp as errors
else:
    from . import errors as errors

if config("EXP_SESSIONS_SEARCH_METRIC", cast=bool, default=False):
    from chalicelib.core import sessions_legacy as sessions
else:
    from chalicelib.core import sessions

PIE_CHART_GROUP = 5


def __try_live(project_id, data: schemas_ee.CardSchema):
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


def __is_funnel_chart(data: schemas_ee.CardSchema):
    return data.metric_type == schemas.MetricType.funnel


def __get_funnel_chart(project_id, data: schemas_ee.CardSchema):
    if len(data.series) == 0:
        return {
            "stages": [],
            "totalDropDueToIssues": 0
        }
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    return funnels.get_top_insights_on_the_fly_widget(project_id=project_id, data=data.series[0].filter)


def __is_errors_list(data: schemas_ee.CardSchema):
    return data.metric_type == schemas.MetricType.table \
        and data.metric_of == schemas.MetricOfTable.errors


def __get_errors_list(project_id, user_id, data: schemas_ee.CardSchema):
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


def __is_sessions_list(data: schemas_ee.CardSchema):
    return data.metric_type == schemas.MetricType.table \
        and data.metric_of == schemas.MetricOfTable.sessions


def __get_sessions_list(project_id, user_id, data: schemas_ee.CardSchema):
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


def __is_predefined(data: schemas_ee.CardSchema):
    return data.is_template


def __is_click_map(data: schemas_ee.CardSchema):
    return data.metric_type == schemas.MetricType.click_map


def __get_click_map_chart(project_id, user_id, data: schemas_ee.CardSchema, include_mobs: bool = True):
    if len(data.series) == 0:
        return None
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    return click_maps.search_short_session(project_id=project_id, user_id=user_id,
                                           data=schemas.FlatClickMapSessionsSearch(**data.series[0].filter.dict()),
                                           include_mobs=include_mobs)


# EE only
def __is_insights(data: schemas_ee.CardSchema):
    return data.metric_type == schemas.MetricType.insights


# EE only
def __get_insights_chart(project_id, user_id, data: schemas_ee.CardSchema):
    return sessions_insights.fetch_selected(project_id=project_id,
                                            data=schemas_ee.GetInsightsSchema(startTimestamp=data.startTimestamp,
                                                                              endTimestamp=data.endTimestamp,
                                                                              metricValue=data.metric_value,
                                                                              series=data.series))


def merged_live(project_id, data: schemas_ee.CardSchema, user_id=None):
    if data.is_template:
        return get_predefined_metric(key=data.metric_of, project_id=project_id, data=data.dict())
    elif __is_funnel_chart(data):
        return __get_funnel_chart(project_id=project_id, data=data)
    elif __is_errors_list(data):
        return __get_errors_list(project_id=project_id, user_id=user_id, data=data)
    elif __is_sessions_list(data):
        return __get_sessions_list(project_id=project_id, user_id=user_id, data=data)
    elif __is_click_map(data):
        return __get_click_map_chart(project_id=project_id, user_id=user_id, data=data)
    # EE only
    elif __is_insights(data):
        return __get_insights_chart(project_id=project_id, user_id=user_id, data=data)
    elif len(data.series) == 0:
        return []
    series_charts = __try_live(project_id=project_id, data=data)
    if data.view_type == schemas.MetricTimeseriesViewType.progress or data.metric_type == schemas.MetricType.table:
        return series_charts
    results = [{}] * len(series_charts[0])
    for i in range(len(results)):
        for j, series_chart in enumerate(series_charts):
            results[i] = {**results[i], "timestamp": series_chart[i]["timestamp"],
                          data.series[j].name if data.series[j].name else j + 1: series_chart[i]["count"]}
    return results


def __merge_metric_with_data(metric: schemas_ee.CardSchema,
                             data: schemas.CardChartSchema) -> schemas_ee.CardSchema:
    if data.series is not None and len(data.series) > 0:
        metric.series = data.series
    metric: schemas_ee.CardSchema = schemas_ee.CardSchema(
        **{**data.dict(by_alias=True), **metric.dict(by_alias=True)})
    if len(data.filters) > 0 or len(data.events) > 0:
        for s in metric.series:
            if len(data.filters) > 0:
                s.filter.filters += data.filters
            if len(data.events) > 0:
                s.filter.events += data.events
    metric.limit = data.limit
    metric.page = data.page
    metric.startTimestamp = data.startTimestamp
    metric.endTimestamp = data.endTimestamp
    return metric


def make_chart(project_id, user_id, data: schemas.CardChartSchema, metric: schemas_ee.CardSchema):
    if metric is None:
        return None
    metric: schemas_ee.CardSchema = __merge_metric_with_data(metric=metric, data=data)

    return merged_live(project_id=project_id, data=metric, user_id=user_id)


def get_sessions(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    # raw_metric = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False, include_data=True)
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if raw_metric is None:
        return None
    metric: schemas_ee.CardSchema = schemas_ee.CardSchema(**raw_metric)
    metric: schemas_ee.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    results = []
    # is_click_map = False
    # if __is_click_map(metric) and raw_metric.get("data") is not None:
    #     is_click_map = True
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        # if is_click_map:
        #     results.append(
        #         {"seriesId": s.series_id, "seriesName": s.name, "total": 1, "sessions": [raw_metric["data"]]})
        #     break
        results.append({"seriesId": s.series_id, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def get_funnel_issues(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if raw_metric is None:
        return None
    metric: schemas_ee.CardSchema = schemas_ee.CardSchema(**raw_metric)
    metric: schemas_ee.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        return {"seriesId": s.series_id, "seriesName": s.name,
                **funnels.get_issues_on_the_fly_widget(project_id=project_id, data=s.filter)}


def get_errors_list(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if raw_metric is None:
        return None
    metric: schemas_ee.CardSchema = schemas_ee.CardSchema(**raw_metric)
    metric: schemas_ee.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        return {"seriesId": s.series_id, "seriesName": s.name,
                **errors.search(data=s.filter, project_id=project_id, user_id=user_id)}


def try_sessions(project_id, user_id, data: schemas.CardSessionsSchema):
    results = []
    if data.series is None:
        return results
    for s in data.series:
        s.filter.startDate = data.startTimestamp
        s.filter.endDate = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        if len(data.filters) > 0:
            s.filter.filters += data.filters
        if len(data.events) > 0:
            s.filter.events += data.events
        results.append({"seriesId": None, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def create(project_id, user_id, data: schemas_ee.CardSchema, dashboard=False):
    with pg_client.PostgresClient() as cur:
        session_data = None
        if __is_click_map(data):
            session_data = __get_click_map_chart(project_id=project_id, user_id=user_id,
                                                 data=data, include_mobs=False)
            if session_data is not None:
                # for EE only
                keys = sessions_mobs. \
                    __get_mob_keys(project_id=project_id, session_id=session_data["sessionId"])
                keys += sessions_mobs. \
                    __get_mob_keys_deprecated(session_id=session_data["sessionId"])  # To support old sessions
                tag = config('RETENTION_L_VALUE', default='vault')
                for k in keys:
                    try:
                        extra.tag_session(file_key=k, tag_value=tag)
                    except Exception as e:
                        print(f"!!!Error while tagging: {k} to {tag} for clickMap")
                        print(str(e))
                session_data = json.dumps(session_data)
        _data = {"session_data": session_data}
        for i, s in enumerate(data.series):
            for k in s.dict().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        params = {"user_id": user_id, "project_id": project_id, **data.dict(), **_data}
        params["default_config"] = json.dumps(data.default_config.dict())
        query = """INSERT INTO metrics (project_id, user_id, name, is_public,
                            view_type, metric_type, metric_of, metric_value,
                            metric_format, default_config, thumbnail, data)
                   VALUES (%(project_id)s, %(user_id)s, %(name)s, %(is_public)s, 
                              %(view_type)s, %(metric_type)s, %(metric_of)s, %(metric_value)s, 
                              %(metric_format)s, %(default_config)s, %(thumbnail)s, %(session_data)s)
                   RETURNING metric_id"""
        if len(data.series) > 0:
            query = f"""WITH m AS ({query})
                        INSERT INTO metric_series(metric_id, index, name, filter)
                        VALUES {",".join([f"((SELECT metric_id FROM m), %(index_{i})s, %(name_{i})s, %(filter_{i})s::jsonb)"
                                          for i in range(series_len)])}
                        RETURNING metric_id;"""

        query = cur.mogrify(query, params)
        # print("-------")
        # print(query)
        # print("-------")
        cur.execute(query)
        r = cur.fetchone()
        if dashboard:
            return r["metric_id"]
    return {"data": get_card(metric_id=r["metric_id"], project_id=project_id, user_id=user_id)}


def update(metric_id, user_id, project_id, data: schemas_ee.UpdateCardSchema):
    metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
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
              "metric_value": data.metric_value, "metric_format": data.metric_format,
              "config": json.dumps(data.default_config.dict()), "thumbnail": data.thumbnail}
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
                edited_at = timezone('utc'::text, now()),
                default_config = %(config)s,
                thumbnail = %(thumbnail)s
            WHERE metric_id = %(metric_id)s
            AND project_id = %(project_id)s 
            AND (user_id = %(user_id)s OR is_public) 
            RETURNING metric_id;""", params)
        cur.execute(query)
    return get_card(metric_id=metric_id, project_id=project_id, user_id=user_id)


def search_all(project_id, user_id, data: schemas.SearchCardsSchema, include_series=False):
    constraints = ["metrics.project_id = %(project_id)s",
                   "metrics.deleted_at ISNULL"]
    params = {"project_id": project_id, "user_id": user_id,
              "offset": (data.page - 1) * data.limit,
              "limit": data.limit, }
    if data.mine_only:
        constraints.append("user_id = %(user_id)s")
    else:
        constraints.append("(user_id = %(user_id)s OR metrics.is_public)")
    if data.shared_only:
        constraints.append("is_public")

    if data.query is not None and len(data.query) > 0:
        constraints.append("(name ILIKE %(query)s OR owner.owner_email ILIKE %(query)s)")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator._contains)
    with pg_client.PostgresClient() as cur:
        sub_join = ""
        if include_series:
            sub_join = """LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index),'[]'::jsonb) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)"""
        query = cur.mogrify(
            f"""SELECT metric_id, project_id, user_id, name, is_public, created_at, edited_at,
                        metric_type, metric_of, metric_format, metric_value, view_type, is_pinned, 
                        dashboards, owner_email, default_config AS config, thumbnail
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
                WHERE {" AND ".join(constraints)}
                ORDER BY created_at {data.order.value}
                LIMIT %(limit)s OFFSET %(offset)s;""", params)
        cur.execute(query)
        rows = cur.fetchall()
        if include_series:
            for r in rows:
                for s in r["series"]:
                    s["filter"] = helper.old_search_payload_to_flat(s["filter"])
        else:
            for r in rows:
                r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
                r["edited_at"] = TimeUTC.datetime_to_timestamp(r["edited_at"])
        rows = helper.list_to_camel_case(rows)
    return rows


def get_all(project_id, user_id):
    default_search = schemas.SearchCardsSchema()
    result = rows = search_all(project_id=project_id, user_id=user_id, data=default_search)
    while len(rows) == default_search.limit:
        default_search.page += 1
        rows = search_all(project_id=project_id, user_id=user_id, data=default_search)
        result += rows

    return result


def delete(project_id, metric_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET deleted_at = timezone('utc'::text, now()), edited_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public)
            RETURNING data;""",
                        {"metric_id": metric_id, "project_id": project_id, "user_id": user_id})
        )
        # for EE only
        row = cur.fetchone()
    if row:
        if row["data"] and not sessions_favorite.favorite_session_exists(session_id=row["data"]["sessionId"]):
            keys = sessions_mobs. \
                __get_mob_keys(project_id=project_id, session_id=row["data"]["sessionId"])
            keys += sessions_mobs. \
                __get_mob_keys_deprecated(session_id=row["data"]["sessionId"])  # To support old sessions
            tag = config('RETENTION_D_VALUE', default='default')
            for k in keys:
                try:
                    extra.tag_session(file_key=k, tag_value=tag)
                except Exception as e:
                    print(f"!!!Error while tagging: {k} to {tag} for clickMap")
                    print(str(e))
    return {"state": "success"}


def get_card(metric_id, project_id, user_id, flatten: bool = True, include_data: bool = False):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT metric_id, project_id, user_id, name, is_public, created_at, deleted_at, edited_at, metric_type, 
                        view_type, metric_of, metric_value, metric_format, is_pinned, default_config, 
                        default_config AS config,series, dashboards, owner_email
                        {',data' if include_data else ''}
                FROM metrics
                         LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(metric_series.* ORDER BY index),'[]'::jsonb) AS series
                                            FROM metric_series
                                            WHERE metric_series.metric_id = metrics.metric_id
                                              AND metric_series.deleted_at ISNULL 
                                            ) AS metric_series ON (TRUE)
                         LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(connected_dashboards.* ORDER BY is_public,name),'[]'::jsonb) AS dashboards
                                            FROM (SELECT dashboard_id, name, is_public
                                                  FROM dashboards INNER JOIN dashboard_widgets USING (dashboard_id)
                                                  WHERE deleted_at ISNULL
                                                    AND project_id = %(project_id)s
                                                    AND ((dashboards.user_id = %(user_id)s OR is_public))
                                                    AND metric_id = %(metric_id)s) AS connected_dashboards
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
        cur.execute(query)
        row = cur.fetchone()
        if row is None:
            return None
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        row["edited_at"] = TimeUTC.datetime_to_timestamp(row["edited_at"])
        if flatten:
            for s in row["series"]:
                s["filter"] = helper.old_search_payload_to_flat(s["filter"])
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
    return get_card(metric_id=metric_id, project_id=project_id, user_id=user_id)


def get_funnel_sessions_by_issue(user_id, project_id, metric_id, issue_id,
                                 data: schemas.CardSessionsSchema
                                 # , range_value=None, start_date=None, end_date=None
                                 ):
    metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if metric is None:
        return None
    metric: schemas_ee.CardSchema = schemas.CardSchema(**metric)
    metric: schemas_ee.CardSchema = __merge_metric_with_data(metric=metric, data=data)
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


def make_chart_from_card(project_id, user_id, metric_id, data: schemas.CardChartSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, include_data=True)
    if raw_metric is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="card not found")
    metric: schemas_ee.CardSchema = schemas_ee.CardSchema(**raw_metric)
    if metric.is_template:
        return get_predefined_metric(key=metric.metric_of, project_id=project_id, data=data.dict())
    elif __is_click_map(metric):
        if raw_metric["data"]:
            keys = sessions_mobs. \
                __get_mob_keys(project_id=project_id, session_id=raw_metric["data"]["sessionId"])
            mob_exists = False
            for k in keys:
                if StorageClient.exists(bucket=config("sessions_bucket"), key=k):
                    mob_exists = True
                    break
            if mob_exists:
                raw_metric["data"]['domURL'] = sessions_mobs.get_urls(session_id=raw_metric["data"]["sessionId"],
                                                                      project_id=project_id)
                raw_metric["data"]['mobsUrl'] = sessions_mobs.get_urls_depercated(
                    session_id=raw_metric["data"]["sessionId"])
                return raw_metric["data"]

    return make_chart(project_id=project_id, user_id=user_id, data=data, metric=metric)


PREDEFINED = {schemas.MetricOfWebVitals.count_sessions: metrics.get_processed_sessions,
              schemas.MetricOfWebVitals.avg_image_load_time: metrics.get_application_activity_avg_image_load_time,
              schemas.MetricOfWebVitals.avg_page_load_time: metrics.get_application_activity_avg_page_load_time,
              schemas.MetricOfWebVitals.avg_request_load_time: metrics.get_application_activity_avg_request_load_time,
              schemas.MetricOfWebVitals.avg_dom_content_load_start: metrics.get_page_metrics_avg_dom_content_load_start,
              schemas.MetricOfWebVitals.avg_first_contentful_pixel: metrics.get_page_metrics_avg_first_contentful_pixel,
              schemas.MetricOfWebVitals.avg_visited_pages: metrics.get_user_activity_avg_visited_pages,
              schemas.MetricOfWebVitals.avg_session_duration: metrics.get_user_activity_avg_session_duration,
              schemas.MetricOfWebVitals.avg_pages_dom_buildtime: metrics.get_pages_dom_build_time,
              schemas.MetricOfWebVitals.avg_pages_response_time: metrics.get_pages_response_time,
              schemas.MetricOfWebVitals.avg_response_time: metrics.get_top_metrics_avg_response_time,
              schemas.MetricOfWebVitals.avg_first_paint: metrics.get_top_metrics_avg_first_paint,
              schemas.MetricOfWebVitals.avg_dom_content_loaded: metrics.get_top_metrics_avg_dom_content_loaded,
              schemas.MetricOfWebVitals.avg_till_first_byte: metrics.get_top_metrics_avg_till_first_bit,
              schemas.MetricOfWebVitals.avg_time_to_interactive: metrics.get_top_metrics_avg_time_to_interactive,
              schemas.MetricOfWebVitals.count_requests: metrics.get_top_metrics_count_requests,
              schemas.MetricOfWebVitals.avg_time_to_render: metrics.get_time_to_render,
              schemas.MetricOfWebVitals.avg_used_js_heap_size: metrics.get_memory_consumption,
              schemas.MetricOfWebVitals.avg_cpu: metrics.get_avg_cpu,
              schemas.MetricOfWebVitals.avg_fps: metrics.get_avg_fps,
              schemas.MetricOfErrors.impacted_sessions_by_js_errors: metrics.get_impacted_sessions_by_js_errors,
              schemas.MetricOfErrors.domains_errors_4xx: metrics.get_domains_errors_4xx,
              schemas.MetricOfErrors.domains_errors_5xx: metrics.get_domains_errors_5xx,
              schemas.MetricOfErrors.errors_per_domains: metrics.get_errors_per_domains,
              schemas.MetricOfErrors.calls_errors: metrics.get_calls_errors,
              schemas.MetricOfErrors.errors_per_type: metrics.get_errors_per_type,
              schemas.MetricOfErrors.resources_by_party: metrics.get_resources_by_party,
              schemas.MetricOfPerformance.speed_location: metrics.get_speed_index_location,
              schemas.MetricOfPerformance.slowest_domains: metrics.get_slowest_domains,
              schemas.MetricOfPerformance.sessions_per_browser: metrics.get_sessions_per_browser,
              schemas.MetricOfPerformance.time_to_render: metrics.get_time_to_render,
              schemas.MetricOfPerformance.impacted_sessions_by_slow_pages: metrics.get_impacted_sessions_by_slow_pages,
              schemas.MetricOfPerformance.memory_consumption: metrics.get_memory_consumption,
              schemas.MetricOfPerformance.cpu: metrics.get_avg_cpu,
              schemas.MetricOfPerformance.fps: metrics.get_avg_fps,
              schemas.MetricOfPerformance.crashes: metrics.get_crashes,
              schemas.MetricOfPerformance.resources_vs_visually_complete: metrics.get_resources_vs_visually_complete,
              schemas.MetricOfPerformance.pages_dom_buildtime: metrics.get_pages_dom_build_time,
              schemas.MetricOfPerformance.pages_response_time: metrics.get_pages_response_time,
              schemas.MetricOfPerformance.pages_response_time_distribution: metrics.get_pages_response_time_distribution,
              schemas.MetricOfResources.missing_resources: metrics.get_missing_resources_trend,
              schemas.MetricOfResources.slowest_resources: metrics.get_slowest_resources,
              schemas.MetricOfResources.resources_loading_time: metrics.get_resources_loading_time,
              schemas.MetricOfResources.resource_type_vs_response_end: metrics.resource_type_vs_response_end,
              schemas.MetricOfResources.resources_count_by_type: metrics.get_resources_count_by_type, }


def get_predefined_metric(key: Union[schemas.MetricOfWebVitals, schemas.MetricOfErrors, \
        schemas.MetricOfPerformance, schemas.MetricOfResources], project_id: int, data: dict):
    return PREDEFINED.get(key, lambda *args: None)(project_id=project_id, **data)
