import json
import logging

from decouple import config
from fastapi import HTTPException, status

import schemas
from chalicelib.core import sessions, funnels, errors, issues, click_maps, sessions_mobs, product_analytics, \
    custom_metrics_predefined
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.storage import StorageClient

logger = logging.getLogger(__name__)
PIE_CHART_GROUP = 5


# TODO: refactor this to split
#  timeseries /
#  table of errors / table of issues / table of browsers / table of devices / table of countries / table of URLs
# remove "table of" calls from this function
def __try_live(project_id, data: schemas.CardSchema):
    results = []
    for i, s in enumerate(data.series):
        results.append(sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                               view_type=data.view_type, metric_type=data.metric_type,
                                               metric_of=data.metric_of, metric_value=data.metric_value))
        if data.view_type == schemas.MetricTimeseriesViewType.progress:
            r = {"count": results[-1]}
            diff = s.filter.endTimestamp - s.filter.startTimestamp
            s.filter.endTimestamp = s.filter.startTimestamp
            s.filter.startTimestamp = s.filter.endTimestamp - diff
            r["previousCount"] = sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                                         view_type=data.view_type, metric_type=data.metric_type,
                                                         metric_of=data.metric_of, metric_value=data.metric_value)
            r["countProgress"] = helper.__progress(old_val=r["previousCount"], new_val=r["count"])
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


def __get_table_of_series(project_id, data: schemas.CardSchema):
    results = []
    for i, s in enumerate(data.series):
        results.append(sessions.search2_table(data=s.filter, project_id=project_id, density=data.density,
                                              metric_of=data.metric_of, metric_value=data.metric_value))

    return results


def __get_funnel_chart(project_id: int, data: schemas.CardFunnel, user_id: int = None):
    if len(data.series) == 0:
        return {
            "stages": [],
            "totalDropDueToIssues": 0
        }
    return funnels.get_top_insights_on_the_fly_widget(project_id=project_id, data=data.series[0].filter)


def __get_errors_list(project_id, user_id, data: schemas.CardSchema):
    if len(data.series) == 0:
        return {
            "total": 0,
            "errors": []
        }
    return errors.search(data.series[0].filter, project_id=project_id, user_id=user_id)


def __get_sessions_list(project_id, user_id, data: schemas.CardSchema):
    if len(data.series) == 0:
        logger.debug("empty series")
        return {
            "total": 0,
            "sessions": []
        }
    return sessions.search_sessions(data=data.series[0].filter, project_id=project_id, user_id=user_id)


def __get_click_map_chart(project_id, user_id, data: schemas.CardClickMap, include_mobs: bool = True):
    if len(data.series) == 0:
        return None
    data.series[0].filter.filters += data.series[0].filter.events
    return click_maps.search_short_session(project_id=project_id, user_id=user_id,
                                           data=schemas.ClickMapSessionsSearch(
                                               **data.series[0].filter.model_dump()),
                                           include_mobs=include_mobs)


def __get_path_analysis_chart(project_id: int, user_id: int, data: schemas.CardPathAnalysis):
    if len(data.series) == 0:
        data.series.append(
            schemas.CardPathAnalysisSeriesSchema(startTimestamp=data.startTimestamp, endTimestamp=data.endTimestamp))
    elif not isinstance(data.series[0].filter, schemas.PathAnalysisSchema):
        data.series[0].filter = schemas.PathAnalysisSchema()

    return product_analytics.path_analysis(project_id=project_id, data=data)


def __get_timeseries_chart(project_id: int, data: schemas.CardTimeSeries, user_id: int = None):
    series_charts = __try_live(project_id=project_id, data=data)
    if data.view_type == schemas.MetricTimeseriesViewType.progress:
        return series_charts
    results = [{}] * len(series_charts[0])
    for i in range(len(results)):
        for j, series_chart in enumerate(series_charts):
            results[i] = {**results[i], "timestamp": series_chart[i]["timestamp"],
                          data.series[j].name if data.series[j].name else j + 1: series_chart[i]["count"]}
    return results


def not_supported(**args):
    raise Exception("not supported")


def __get_table_of_user_ids(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_of_sessions(project_id: int, data: schemas.CardTable, user_id):
    return __get_sessions_list(project_id=project_id, user_id=user_id, data=data)


def __get_table_of_errors(project_id: int, data: schemas.CardTable, user_id: int):
    return __get_errors_list(project_id=project_id, user_id=user_id, data=data)


def __get_table_of_issues(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_of_browsers(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_of_devises(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_of_countries(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_of_urls(project_id: int, data: schemas.CardTable, user_id: int = None):
    return __get_table_of_series(project_id=project_id, data=data)


def __get_table_chart(project_id: int, data: schemas.CardTable, user_id: int):
    supported = {
        schemas.MetricOfTable.sessions: __get_table_of_sessions,
        schemas.MetricOfTable.errors: __get_table_of_errors,
        schemas.MetricOfTable.user_id: __get_table_of_user_ids,
        schemas.MetricOfTable.issues: __get_table_of_issues,
        schemas.MetricOfTable.user_browser: __get_table_of_browsers,
        schemas.MetricOfTable.user_device: __get_table_of_devises,
        schemas.MetricOfTable.user_country: __get_table_of_countries,
        schemas.MetricOfTable.visited_url: __get_table_of_urls,
    }
    return supported.get(data.metric_of, not_supported)(project_id=project_id, data=data, user_id=user_id)


def get_chart(project_id: int, data: schemas.CardSchema, user_id: int):
    if data.is_predefined:
        return custom_metrics_predefined.get_metric(key=data.metric_of,
                                                    project_id=project_id,
                                                    data=data.model_dump())

    supported = {
        schemas.MetricType.timeseries: __get_timeseries_chart,
        schemas.MetricType.table: __get_table_chart,
        schemas.MetricType.click_map: __get_click_map_chart,
        schemas.MetricType.funnel: __get_funnel_chart,
        schemas.MetricType.insights: not_supported,
        schemas.MetricType.pathAnalysis: __get_path_analysis_chart
    }
    return supported.get(data.metric_type, not_supported)(project_id=project_id, data=data, user_id=user_id)


def __merge_metric_with_data(metric: schemas.CardSchema,
                             data: schemas.CardSessionsSchema) -> schemas.CardSchema:
    metric.startTimestamp = data.startTimestamp
    metric.endTimestamp = data.endTimestamp
    metric.page = data.page
    metric.limit = data.limit
    metric.density = data.density
    if data.series is not None and len(data.series) > 0:
        metric.series = data.series

    # if len(data.filters) > 0:
    #     for s in metric.series:
    #         s.filter.filters += data.filters
    # metric = schemas.CardSchema(**metric.model_dump(by_alias=True))
    return metric


def get_sessions_by_card_id(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    card: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if card is None:
        return None
    metric: schemas.CardSchema = schemas.CardSchema(**card)
    metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    results = []
    for s in metric.series:
        results.append({"seriesId": s.series_id, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def get_funnel_issues(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if raw_metric is None:
        return None
    metric: schemas.CardSchema = schemas.CardSchema(**raw_metric)
    metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        return {"seriesId": s.series_id, "seriesName": s.name,
                **funnels.get_issues_on_the_fly_widget(project_id=project_id, data=s.filter)}


def get_errors_list(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if raw_metric is None:
        return None
    metric: schemas.CardSchema = schemas.CardSchema(**raw_metric)
    metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        return {"seriesId": s.series_id, "seriesName": s.name,
                **errors.search(data=s.filter, project_id=project_id, user_id=user_id)}


def get_sessions(project_id, user_id, data: schemas.CardSessionsSchema):
    results = []
    if len(data.series) == 0:
        return results
    for s in data.series:
        if len(data.filters) > 0:
            s.filter.filters += data.filters
            s.filter = schemas.SessionsSearchPayloadSchema(**s.filter.model_dump(by_alias=True))

        results.append({"seriesId": None, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def __get_funnel_issues(project_id: int, user_id: int, data: schemas.CardFunnel):
    if len(data.series) == 0:
        return []
    data.series[0].filter.startTimestamp = data.startTimestamp
    data.series[0].filter.endTimestamp = data.endTimestamp
    data = funnels.get_issues_on_the_fly_widget(project_id=project_id, data=data.series[0].filter)
    return data


def __get_path_analysis_issues(project_id: int, user_id: int, data: schemas.CardPathAnalysis):
    if len(data.filters) > 0 or len(data.series) > 0:
        filters = [f.model_dump(by_alias=True) for f in data.filters] \
                  + [f.model_dump(by_alias=True) for f in data.series[0].filter.filters]
    else:
        return []

    search_data = schemas.SessionsSearchPayloadSchema(
        startTimestamp=data.startTimestamp,
        endTimestamp=data.endTimestamp,
        limit=data.limit,
        page=data.page,
        filters=filters
    )

    for s in data.excludes:
        search_data.filters.append(schemas.SessionSearchEventSchema2(type=s.type,
                                                                     operator=schemas.SearchEventOperator._not_on,
                                                                     value=s.value))
    result = sessions.search_table_of_individual_issues(project_id=project_id, data=search_data)
    return result


def get_issues(project_id: int, user_id: int, data: schemas.CardSchema):
    if data.is_predefined:
        return not_supported()
    if data.metric_of == schemas.MetricOfTable.issues:
        return __get_table_of_issues(project_id=project_id, user_id=user_id, data=data)
    supported = {
        schemas.MetricType.timeseries: not_supported,
        schemas.MetricType.table: not_supported,
        schemas.MetricType.click_map: not_supported,
        schemas.MetricType.funnel: __get_funnel_issues,
        schemas.MetricType.insights: not_supported,
        schemas.MetricType.pathAnalysis: __get_path_analysis_issues,
    }
    return supported.get(data.metric_type, not_supported)(project_id=project_id, data=data, user_id=user_id)


def __get_path_analysis_card_info(data: schemas.CardPathAnalysis):
    r = {"start_point": [s.model_dump() for s in data.start_point],
         "start_type": data.start_type,
         "excludes": [e.model_dump() for e in data.excludes],
         "hideExcess": data.hide_excess}
    return r


def create_card(project_id, user_id, data: schemas.CardSchema, dashboard=False):
    with pg_client.PostgresClient() as cur:
        session_data = None
        if data.metric_type == schemas.MetricType.click_map:
            session_data = __get_click_map_chart(project_id=project_id, user_id=user_id,
                                                 data=data, include_mobs=False)
            if session_data is not None:
                session_data = json.dumps(session_data)
        _data = {"session_data": session_data}
        for i, s in enumerate(data.series):
            for k in s.model_dump().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        params = {"user_id": user_id, "project_id": project_id, **data.model_dump(), **_data}
        params["default_config"] = json.dumps(data.default_config.model_dump())
        params["card_info"] = None
        if data.metric_type == schemas.MetricType.pathAnalysis:
            params["card_info"] = json.dumps(__get_path_analysis_card_info(data=data))

        query = """INSERT INTO metrics (project_id, user_id, name, is_public,
                            view_type, metric_type, metric_of, metric_value,
                            metric_format, default_config, thumbnail, data,
                            card_info)
                   VALUES (%(project_id)s, %(user_id)s, %(name)s, %(is_public)s, 
                              %(view_type)s, %(metric_type)s, %(metric_of)s, %(metric_value)s, 
                              %(metric_format)s, %(default_config)s, %(thumbnail)s, %(session_data)s,
                              %(card_info)s)
                   RETURNING metric_id"""
        if len(data.series) > 0:
            query = f"""WITH m AS ({query})
                        INSERT INTO metric_series(metric_id, index, name, filter)
                        VALUES {",".join([f"((SELECT metric_id FROM m), %(index_{i})s, %(name_{i})s, %(filter_{i})s::jsonb)"
                                          for i in range(series_len)])}
                        RETURNING metric_id;"""

        query = cur.mogrify(query, params)
        cur.execute(query)
        r = cur.fetchone()
        if dashboard:
            return r["metric_id"]
    return {"data": get_card(metric_id=r["metric_id"], project_id=project_id, user_id=user_id)}


def update_card(metric_id, user_id, project_id, data: schemas.CardSchema):
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
              "config": json.dumps(data.default_config.model_dump()), "thumbnail": data.thumbnail}
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
        ns = s.model_dump()
        for k in ns.keys():
            if k == "filter":
                ns[k] = json.dumps(ns[k])
            params[f"{prefix}{k}_{i}"] = ns[k]
    for i in series_ids:
        if i not in u_series_ids:
            d_series_ids.append(i)
    params["d_series_ids"] = tuple(d_series_ids)
    params["card_info"] = None
    if data.metric_type == schemas.MetricType.pathAnalysis:
        params["card_info"] = json.dumps(__get_path_analysis_card_info(data=data))

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
                thumbnail = %(thumbnail)s,
                card_info = %(card_info)s
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


def delete_card(project_id, metric_id, user_id):
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


def __get_path_analysis_attributes(row):
    card_info = row.pop("cardInfo")
    row["excludes"] = card_info.get("excludes", [])
    row["startPoint"] = card_info.get("startPoint", [])
    row["startType"] = card_info.get("startType", "start")
    row["hideExcess"] = card_info.get("hideExcess", False)
    return row


def get_card(metric_id, project_id, user_id, flatten: bool = True, include_data: bool = False):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT metric_id, project_id, user_id, name, is_public, created_at, deleted_at, edited_at, metric_type, 
                        view_type, metric_of, metric_value, metric_format, is_pinned, default_config, 
                        default_config AS config,series, dashboards, owner_email, card_info
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
        row = helper.dict_to_camel_case(row)
        if row["metricType"] == schemas.MetricType.pathAnalysis:
            row = __get_path_analysis_attributes(row=row)
    return row


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
    card: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    if card is None:
        return None
    metric: schemas.CardSchema = schemas.CardSchema(**card)
    metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if metric is None:
        return None
    for s in metric.series:
        s.filter.startTimestamp = data.startTimestamp
        s.filter.endTimestamp = data.endTimestamp
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


def make_chart_from_card(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    raw_metric: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, include_data=True)

    if raw_metric is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="card not found")
    raw_metric["startTimestamp"] = data.startTimestamp
    raw_metric["endTimestamp"] = data.endTimestamp
    raw_metric["limit"] = data.limit
    raw_metric["density"] = data.density
    metric: schemas.CardSchema = schemas.CardSchema(**raw_metric)

    if metric.is_predefined:
        return custom_metrics_predefined.get_metric(key=metric.metric_of,
                                                    project_id=project_id,
                                                    data=data.model_dump())
    elif metric.metric_type == schemas.MetricType.click_map:
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

    return get_chart(project_id=project_id, data=metric, user_id=user_id)
