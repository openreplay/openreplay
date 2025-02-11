import logging

import schemas
from chalicelib.core import metadata
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import get_step_size

logger = logging.getLogger(__name__)


def __get_constraints(project_id, time_constraint=True, chart=False, duration=True, project=True,
                      project_identifier="project_id",
                      main_table="sessions", time_column="start_ts", data={}):
    pg_sub_query = []
    main_table = main_table + "." if main_table is not None and len(main_table) > 0 else ""
    if project:
        pg_sub_query.append(f"{main_table}{project_identifier} =%({project_identifier})s")
    if duration:
        pg_sub_query.append(f"{main_table}duration>0")
    if time_constraint:
        pg_sub_query.append(f"{main_table}{time_column} >= %(startTimestamp)s")
        pg_sub_query.append(f"{main_table}{time_column} < %(endTimestamp)s")
    if chart:
        pg_sub_query.append(f"{main_table}{time_column} >= generated_timestamp")
        pg_sub_query.append(f"{main_table}{time_column} < generated_timestamp + %(step_size)s")
    return pg_sub_query + __get_meta_constraint(project_id=project_id, data=data)


def __merge_charts(list1, list2, time_key="timestamp"):
    if len(list1) != len(list2):
        raise Exception("cannot merge unequal lists")
    result = []
    for i in range(len(list1)):
        timestamp = min(list1[i][time_key], list2[i][time_key])
        result.append({**list1[i], **list2[i], time_key: timestamp})
    return result


def __get_constraint_values(data):
    params = {}
    for i, f in enumerate(data.get("filters", [])):
        params[f"{f['key']}_{i}"] = f["value"]
    return params


def __get_meta_constraint(project_id, data):
    if len(data.get("filters", [])) == 0:
        return []
    constraints = []
    meta_keys = metadata.get(project_id=project_id)
    meta_keys = {m["key"]: m["index"] for m in meta_keys}

    for i, f in enumerate(data.get("filters", [])):
        if f["key"] in meta_keys.keys():
            key = f"sessions.metadata_{meta_keys[f['key']]})"
            if f["value"] in ["*", ""]:
                constraints.append(f"{key} IS NOT NULL")
            else:
                constraints.append(f"{key} = %({f['key']}_{i})s")
        else:
            filter_type = f["key"].upper()
            filter_type = [filter_type, "USER" + filter_type, filter_type[4:]]
            if any(item in [schemas.FilterType.USER_BROWSER] \
                   for item in filter_type):
                constraints.append(f"sessions.user_browser = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_os = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_device = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_country  = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_id = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_ANONYMOUS_ID, schemas.FilterType.USER_ANONYMOUS_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_anonymous_id = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.rev_id = %({f['key']}_{i})s")
    return constraints


def __get_neutral(rows, add_All_if_empty=True):
    neutral = {l: 0 for l in [i for k in [list(v.keys()) for v in rows] for i in k]}
    if add_All_if_empty and len(neutral.keys()) <= 1:
        neutral = {"All": 0}
    return neutral


def __merge_rows_with_neutral(rows, neutral):
    for i in range(len(rows)):
        rows[i] = {**neutral, **rows[i]}
    return rows


def __nested_array_to_dict_array(rows, key="url_host", value="count"):
    for r in rows:
        for i in range(len(r["keys"])):
            r[r["keys"][i][key]] = r["keys"][i][value]
        r.pop("keys")
    return rows


def get_user_activity_avg_visited_pages(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(), **args):
    with pg_client.PostgresClient() as cur:
        row = __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        results["chart"] = __get_user_activity_avg_visited_pages_chart(cur, project_id, startTimestamp,
                                                                       endTimestamp, **args)

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args)

        previous = helper.dict_to_camel_case(row)
        results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results


def __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("sessions.pages_count>0")
    pg_query = f"""SELECT COALESCE(CEIL(AVG(sessions.pages_count)),0) AS value
                    FROM public.sessions
                    WHERE {" AND ".join(pg_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    cur.execute(cur.mogrify(pg_query, params))
    row = cur.fetchone()
    return row


def __get_user_activity_avg_visited_pages_chart(cur, project_id, startTimestamp, endTimestamp, density=20, **args):
    step_size = get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True,
                                            chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="sessions", time_column="start_ts",
                                           duration=False)
    pg_sub_query_subset.append("sessions.duration IS NOT NULL")

    pg_query = f"""WITH sessions AS(SELECT sessions.pages_count, sessions.start_ts
                                    FROM public.sessions
                                    WHERE {" AND ".join(pg_sub_query_subset)}
                    )
                    SELECT generated_timestamp AS timestamp,
                         COALESCE(AVG(sessions.pages_count),0) AS value
                      FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL (
                                SELECT sessions.pages_count
                                FROM sessions
                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS sessions ON (TRUE)
                      GROUP BY generated_timestamp
                      ORDER BY generated_timestamp;"""
    cur.execute(cur.mogrify(pg_query, {**params, **__get_constraint_values(args)}))
    rows = cur.fetchall()
    return rows


def get_unique_users(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(),
                     density=7, **args):
    step_size = get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query.append("user_id IS NOT NULL")
    pg_sub_query.append("user_id != ''")
    pg_sub_query_chart.append("user_id IS NOT NULL")
    pg_sub_query_chart.append("user_id != ''")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                               COALESCE(COUNT(sessions), 0) AS value
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT DISTINCT user_id
                                                 FROM public.sessions
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS sessions ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        results = {
            "value": sum([r["value"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        pg_query = f"""SELECT COUNT(DISTINCT sessions.user_id) AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        cur.execute(cur.mogrify(pg_query, params))

        count = cur.fetchone()["count"]

        results["progress"] = helper.__progress(old_val=count, new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results
