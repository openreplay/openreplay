import json

import schemas
from chalicelib.core import sessions
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def try_live(project_id, data: schemas.TryCustomMetricsSchema):
    results = []
    for s in data.series:
        s.filter.startDate = data.startDate
        s.filter.endDate = data.endDate
        results.append(sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                               view_type=data.viewType))
        if data.viewType == schemas.MetricViewType.progress:
            r = {"count": results[-1]}
            diff = s.filter.endDate - s.filter.startDate
            s.filter.startDate = data.endDate
            s.filter.endDate = data.endDate - diff
            r["previousCount"] = sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                                         view_type=data.viewType)
            r["countProgress"] = helper.__progress(old_val=r["previousCount"], new_val=r["count"])
            results[-1] = r
    return results


def make_chart(project_id, user_id, metric_id, data: schemas.CustomMetricChartPayloadSchema):
    metric = get(metric_id=metric_id, project_id=project_id, user_id=user_id)
    metric: schemas.TryCustomMetricsSchema = schemas.TryCustomMetricsSchema.parse_obj({**data.dict(), **metric})
    return try_live(project_id=project_id, data=metric)


def create(project_id, user_id, data: schemas.CreateCustomMetricsSchema):
    with pg_client.PostgresClient() as cur:
        _data = {}
        for i, s in enumerate(data.series):
            for k in s.dict().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        data.series = None
        params = {"user_id": user_id, "project_id": project_id, **data.dict(), **_data}
        query = cur.mogrify(f"""\
            WITH m AS (INSERT INTO metrics (project_id, user_id, name)
                         VALUES (%(project_id)s, %(user_id)s, %(name)s)
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
    return {"data": get(metric_id=r["metric_id"], project_id=project_id, user_id=user_id)}


def __get_series_id(metric_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT series_id
                    FROM metric_series
                    WHERE metric_series.metric_id = %(metric_id)s
                      AND metric_series.deleted_at ISNULL;""",
                {"metric_id": metric_id}
            )
        )
        rows = cur.fetchall()
    return [r["series_id"] for r in rows]


def update(metric_id, user_id, project_id, data: schemas.UpdateCustomMetricsSchema):
    series_ids = __get_series_id(metric_id)
    n_series = []
    d_series_ids = []
    u_series = []
    u_series_ids = []
    params = {"metric_id": metric_id, "is_public": data.is_public, "name": data.name,
              "user_id": user_id, "project_id": project_id}
    for i, s in enumerate(data.series):
        prefix = "u_"
        if s.series_id is None:
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
                        index=series.filter.index
                    FROM (VALUES {",".join([f"(%(u_series_id_{s['i']})s,%(u_index_{s['i']})s,%(u_name_{s['i']})s,%(u_filter_{s['i']})s::jsonb)"
                                            for s in n_series])}) AS series(series_id, index, name, filter)
                    WHERE metric_id =%(metric_id)s AND series_id=series.series_id
                 RETURNING 1)""")
        if len(d_series_ids) > 0:
            sub_queries.append("""\
            d AS (DELETE FROM metric_series WHERE metric_id =%(metric_id)s AND series_id IN %(d_series_ids)s
                 RETURNING 1)""")
        query = cur.mogrify(f"""\
            {"WITH " if len(sub_queries) > 0 else ""}{",".join(sub_queries)}
            UPDATE metrics
            SET name = %(name)s, is_public= %(is_public)s 
            WHERE metric_id = %(metric_id)s
            AND project_id = %(project_id)s 
            AND (user_id = %(user_id)s OR is_public) 
            RETURNING metric_id;""", params)
        cur.execute(
            query
        )
        r = cur.fetchone()
    return get(metric_id=metric_id, project_id=project_id, user_id=user_id)


def get_all(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT *
                    FROM metrics
                             LEFT JOIN LATERAL (SELECT jsonb_agg(metric_series.* ORDER BY index) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)
                    WHERE metrics.project_id = %(project_id)s
                      AND metrics.deleted_at ISNULL
                      AND (user_id = %(user_id)s OR is_public)
                    ORDER BY created_at;""",
                {"project_id": project_id, "user_id": user_id}
            )
        )
        rows = cur.fetchall()
        for r in rows:
            r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
        rows = helper.list_to_camel_case(rows)
    return rows


def delete(project_id, metric_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET deleted_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public);""",
                        {"metric_id": metric_id, "project_id": project_id, "user_id": user_id})
        )

    return {"state": "success"}


def get(metric_id, project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT *
                    FROM metrics
                             LEFT JOIN LATERAL (SELECT jsonb_agg(metric_series.* ORDER BY index) AS series
                                                FROM metric_series
                                                WHERE metric_series.metric_id = metrics.metric_id
                                                  AND metric_series.deleted_at ISNULL 
                                                ) AS metric_series ON (TRUE)
                    WHERE metrics.project_id = %(project_id)s
                      AND metrics.deleted_at ISNULL
                      AND (metrics.user_id = %(user_id)s OR metrics.is_public)
                      AND metrics.metric_id = %(metric_id)s
                    ORDER BY created_at;""",
                {"metric_id": metric_id, "project_id": project_id, "user_id": user_id}
            )
        )
        row = cur.fetchone()
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    return helper.dict_to_camel_case(row)


def get_series_for_alert(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT metric_id, 
                        series_id, 
                        metrics.name AS metric_name, 
                        metric_series.name AS series_name, 
                        index AS series_index
                    FROM metric_series
                             INNER JOIN metrics USING (metric_id)
                    WHERE metrics.deleted_at ISNULL
                      AND metrics.project_id = %(project_id)s
                      AND (user_id = %(user_id)s OR is_public)
                    ORDER BY metric_name, series_index, series_name;""",
                {"project_id": project_id, "user_id": user_id}
            )
        )
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)
