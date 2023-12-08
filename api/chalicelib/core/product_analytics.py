from typing import List

import schemas
from chalicelib.core import metadata
from chalicelib.core.metrics import __get_constraints, __get_constraint_values
from chalicelib.utils import helper, dev
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils import sql_helper as sh
from time import time
import logging

logger = logging.getLogger(__name__)


def __transform_journey(rows, reverse_path=False):
    total_100p = 0
    number_of_step1 = 0
    for r in rows:
        if r["event_number_in_session"] > 1:
            break
        number_of_step1 += 1
        total_100p += r["sessions_count"]
    # for i in range(number_of_step1):
    #     rows[i]["value"] = 100 / number_of_step1

    # for i in range(number_of_step1, len(rows)):
    for i in range(len(rows)):
        rows[i]["value"] = rows[i]["sessions_count"] * 100 / total_100p

    nodes = []
    nodes_values = []
    links = []
    for r in rows:
        source = f"{r['event_number_in_session']}_{r['event_type']}_{r['e_value']}"
        if source not in nodes:
            nodes.append(source)
            nodes_values.append({"name": r['e_value'], "eventType": r['event_type'],
                                 "avgTimeFromPrevious": 0, "sessionsCount": 0})
        if r['next_value']:
            target = f"{r['event_number_in_session'] + 1}_{r['next_type']}_{r['next_value']}"
            if target not in nodes:
                nodes.append(target)
                nodes_values.append({"name": r['next_value'], "eventType": r['next_type'],
                                     "avgTimeFromPrevious": 0, "sessionsCount": 0})

            sr_idx = nodes.index(source)
            tg_idx = nodes.index(target)
            if r["avg_time_from_previous"] is not None:
                nodes_values[tg_idx]["avgTimeFromPrevious"] += r["avg_time_from_previous"] * r["sessions_count"]
                nodes_values[tg_idx]["sessionsCount"] += r["sessions_count"]
            link = {"eventType": r['event_type'], "sessionsCount": r["sessions_count"],
                    "value": r["value"], "avgTimeFromPrevious": r["avg_time_from_previous"]}
            if not reverse_path:
                link["source"] = sr_idx
                link["target"] = tg_idx
            else:
                link["source"] = tg_idx
                link["target"] = sr_idx
            links.append(link)
    for n in nodes_values:
        if n["sessionsCount"] > 0:
            n["avgTimeFromPrevious"] = n["avgTimeFromPrevious"] / n["sessionsCount"]
        else:
            n["avgTimeFromPrevious"] = None
        n.pop("sessionsCount")

    return {"nodes": nodes_values,
            "links": sorted(links, key=lambda x: (x["source"], x["target"]), reverse=False)}


JOURNEY_TYPES = {
    schemas.ProductAnalyticsSelectedEventType.location: {"table": "events.pages", "column": "path"},
    schemas.ProductAnalyticsSelectedEventType.click: {"table": "events.clicks", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.input: {"table": "events.inputs", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.custom_event: {"table": "events_common.customs", "column": "name"}
}


# query: Q5, the result is correct,
# startPoints are computed before ranked_events to reduce the number of window functions over rows
# replaced time_to_target by time_from_previous
# compute avg_time_from_previous at the same level as sessions_count
# sort by top 5 according to sessions_count at the CTE level
# final part project data without grouping
# if start-point is selected, the selected event is ranked n°1
def path_analysis(project_id: int, data: schemas.CardPathAnalysis):
    sub_events = []
    start_points_from = "pre_ranked_events"
    sub_sessions_extra_projection = ""
    start_points_conditions = []
    sessions_conditions = ["start_ts>=%(startTimestamp)s", "start_ts<%(endTimestamp)s",
                           "project_id=%(project_id)s", "events_count > 1", "duration>0"]
    if len(data.metric_value) == 0:
        data.metric_value.append(schemas.ProductAnalyticsSelectedEventType.location)
        sub_events.append({"table": JOURNEY_TYPES[schemas.ProductAnalyticsSelectedEventType.location]["table"],
                           "column": JOURNEY_TYPES[schemas.ProductAnalyticsSelectedEventType.location]["column"],
                           "eventType": schemas.ProductAnalyticsSelectedEventType.location.value})
    else:
        for v in data.metric_value:
            if JOURNEY_TYPES.get(v):
                sub_events.append({"table": JOURNEY_TYPES[v]["table"],
                                   "column": JOURNEY_TYPES[v]["column"],
                                   "eventType": v})

    extra_values = {}
    start_join = []
    reverse = data.start_type == "end"
    for i, sf in enumerate(data.start_point):
        f_k = f"start_point_{i}"
        op = sh.get_sql_operator(sf.operator)
        sf.value = helper.values_for_operator(value=sf.value, op=sf.operator)
        is_not = sh.is_negation_operator(sf.operator)
        extra_values = {**extra_values, **sh.multi_values(sf.value, value_key=f_k)}
        start_points_conditions.append(f"(event_type='{sf.type}' AND " +
                                       sh.multi_conditions(f'e_value {op} %({f_k})s', sf.value, is_not=is_not,
                                                           value_key=f_k)
                                       + ")")
        main_column = JOURNEY_TYPES[sf.type]["column"]
        sessions_conditions.append(sh.multi_conditions(f'{main_column} {op} %({f_k})s', sf.value, is_not=is_not,
                                                       value_key=f_k))
        sessions_conditions += ["timestamp>=%(startTimestamp)s", "timestamp<%(endTimestamp)s"]
        start_join.append(f"INNER JOIN {JOURNEY_TYPES[sf.type]['table']} USING (session_id)")

    exclusions = {}
    for i, ef in enumerate(data.excludes):
        if len(ef.value) == 0:
            continue
        ef.value = helper.values_for_operator(value=ef.value, op=ef.operator)
        op = sh.get_sql_operator(ef.operator)
        op = sh.reverse_sql_operator(op)
        if ef.type in data.metric_value:
            f_k = f"exclude_{i}"
            extra_values = {**extra_values, **sh.multi_values(ef.value, value_key=f_k)}
            exclusions[ef.type] = [
                sh.multi_conditions(f'{JOURNEY_TYPES[ef.type]["column"]} {op} %({f_k})s', ef.value, is_not=True,
                                    value_key=f_k)]

    meta_keys = None
    for i, f in enumerate(data.series[0].filter.filters):
        op = sh.get_sql_operator(f.operator)
        is_any = sh.isAny_opreator(f.operator)
        is_not = sh.is_negation_operator(f.operator)
        is_undefined = sh.isUndefined_operator(f.operator)
        f_k = f"f_value_{i}"
        extra_values = {**extra_values, **sh.multi_values(f.value, value_key=f_k)}

        if not is_any and len(f.value) == 0:
            continue

        # ---- meta-filters
        if f.type == schemas.FilterType.user_browser:
            if is_any:
                sessions_conditions.append('user_browser IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_os]:
            if is_any:
                sessions_conditions.append('user_os IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_device]:
            if is_any:
                sessions_conditions.append('user_device IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_country]:
            if is_any:
                sessions_conditions.append('user_country IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.user_city:
            if is_any:
                sessions_conditions.append('user_city IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.user_state:
            if is_any:
                sessions_conditions.append('user_state IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.utm_source]:
            if is_any:
                sessions_conditions.append('utm_source IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('utm_source IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.utm_medium]:
            if is_any:
                sessions_conditions.append('utm_medium IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('utm_medium IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.utm_campaign]:
            if is_any:
                sessions_conditions.append('utm_campaign IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('utm_campaign IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_campaign {op} %({f_k})s::text', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type == schemas.FilterType.duration:
            if len(f.value) > 0 and f.value[0] is not None:
                sessions_conditions.append("duration >= %(minDuration)s")
                extra_values["minDuration"] = f.value[0]
            if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                sessions_conditions.append("duration <= %(maxDuration)s")
                extra_values["maxDuration"] = f.value[1]
        elif f.type == schemas.FilterType.referrer:
            # extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
            if is_any:
                sessions_conditions.append('base_referrer IS NOT NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"base_referrer {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
        elif f.type == schemas.FilterType.metadata:
            # get metadata list only if you need it
            if meta_keys is None:
                meta_keys = metadata.get(project_id=project_id)
                meta_keys = {m["key"]: m["index"] for m in meta_keys}
            if f.source in meta_keys.keys():
                if is_any:
                    sessions_conditions.append(f"{metadata.index_to_colname(meta_keys[f.source])} IS NOT NULL")
                elif is_undefined:
                    sessions_conditions.append(f"{metadata.index_to_colname(meta_keys[f.source])} IS NULL")
                else:
                    sessions_conditions.append(
                        sh.multi_conditions(
                            f"{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                            f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            if is_any:
                sessions_conditions.append('user_id IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('user_id IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"user_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.user_anonymous_id,
                        schemas.FilterType.user_anonymous_id_ios]:
            if is_any:
                sessions_conditions.append('user_anonymous_id IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('user_anonymous_id IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
            if is_any:
                sessions_conditions.append('rev_id IS NOT NULL')
            elif is_undefined:
                sessions_conditions.append('rev_id IS NULL')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"rev_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.platform:
            # op = __ sh.get_sql_operator(f.operator)
            sessions_conditions.append(
                sh.multi_conditions(f"user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                    value_key=f_k))

        elif f.type == schemas.FilterType.issue:
            if is_any:
                sessions_conditions.append("array_length(issue_types, 1) > 0")
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"%({f_k})s {op} ANY (issue_types)", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type == schemas.FilterType.events_count:
            sessions_conditions.append(
                sh.multi_conditions(f"events_count {op} %({f_k})s", f.value, is_not=is_not,
                                    value_key=f_k))
    events_subquery = []
    for t in sub_events:
        sub_events_conditions = ["e.timestamp >= %(startTimestamp)s",
                                 "e.timestamp < %(endTimestamp)s"] + exclusions.get(t["eventType"], [])
        if len(start_points_conditions) > 0:
            sub_events_conditions.append("e.timestamp >= sub_sessions.start_event_timestamp")
        events_subquery.append(f"""\
                   SELECT session_id, {t["column"]} AS e_value, timestamp, '{t["eventType"]}' AS event_type
                   FROM {t["table"]} AS e INNER JOIN sub_sessions USING (session_id)
                   WHERE {" AND ".join(sub_events_conditions)}""")
    events_subquery = "\n UNION ALL \n".join(events_subquery)

    if reverse:
        path_direction = "DESC"
    else:
        path_direction = ""

    if len(start_points_conditions) == 0:
        start_points_from = """(SELECT event_type, e_value
                                FROM pre_ranked_events
                                WHERE event_number_in_session = 1
                                GROUP BY event_type, e_value
                                ORDER BY count(1) DESC
                                LIMIT 1) AS top_start_events
                                   INNER JOIN pre_ranked_events
                                              USING (event_type, e_value)"""
    else:
        sub_sessions_extra_projection = ", MIN(timestamp) AS start_event_timestamp"
        start_points_conditions = ["(" + " OR ".join(start_points_conditions) + ")"]
    start_points_conditions.append("event_number_in_session = 1")

    steps_query = ["""n1 AS (SELECT event_number_in_session,
                                    event_type,
                                    e_value,
                                    next_type,
                                    next_value,
                                    AVG(time_from_previous) AS avg_time_from_previous,
                                    COUNT(1) AS sessions_count
                             FROM ranked_events INNER JOIN start_points USING (session_id)
                             WHERE event_number_in_session = 1 
                                AND next_value IS NOT NULL
                             GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
                             ORDER BY sessions_count DESC
                             LIMIT %(eventThresholdNumberInGroup)s)"""]
    projection_query = ["""(SELECT event_number_in_session,
                                   event_type,
                                   e_value,
                                   next_type,
                                   next_value,
                                   sessions_count,
                                   avg_time_from_previous
                           FROM n1)"""]

    for i in range(2, data.density + 1):
        steps_query.append(f"""n{i} AS (SELECT *
                                      FROM (SELECT re.event_number_in_session,
                                                   re.event_type,
                                                   re.e_value,
                                                   re.next_type,
                                                   re.next_value,
                                                   AVG(re.time_from_previous) AS avg_time_from_previous,
                                                   COUNT(1) AS sessions_count
                                            FROM ranked_events AS re
                                                     INNER JOIN n{i - 1} ON (n{i - 1}.next_value = re.e_value)
                                            WHERE re.event_number_in_session = {i}
                                            GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type, re.next_value) AS sub_level
                                      ORDER BY sessions_count DESC
                                      LIMIT %(eventThresholdNumberInGroup)s)""")
        projection_query.append(f"""(SELECT event_number_in_session,
                                            event_type,
                                            e_value,
                                            next_type,
                                            next_value,
                                            sessions_count,
                                            avg_time_from_previous
                                     FROM n{i})""")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""\
WITH sub_sessions AS (SELECT session_id {sub_sessions_extra_projection}
                      FROM public.sessions {" ".join(start_join)}
                      WHERE {" AND ".join(sessions_conditions)}
                      {"GROUP BY session_id" if len(start_points_conditions) > 0 else ""}),
     sub_events AS ({events_subquery}),
     pre_ranked_events AS (SELECT *
                           FROM (SELECT session_id,
                                        event_type,
                                        e_value,
                                        timestamp,
                                        row_number() OVER (PARTITION BY session_id ORDER BY timestamp {path_direction}) AS event_number_in_session
                                 FROM sub_events
                                 ORDER BY session_id) AS full_ranked_events
                           WHERE event_number_in_session <= %(density)s),
     start_points AS (SELECT session_id
                      FROM {start_points_from}
                      WHERE {" AND ".join(start_points_conditions)}),
     ranked_events AS (SELECT *,
                              LEAD(e_value, 1) OVER (PARTITION BY session_id ORDER BY timestamp {path_direction})    AS next_value,
                              LEAD(event_type, 1) OVER (PARTITION BY session_id ORDER BY timestamp {path_direction}) AS next_type,
                              abs(LAG(timestamp, 1) OVER (PARTITION BY session_id ORDER BY timestamp {path_direction}) -
                                  timestamp)                                                         AS time_from_previous
                       FROM pre_ranked_events INNER JOIN start_points USING (session_id)),
     {",".join(steps_query)}
{"UNION ALL".join(projection_query)};"""
        params = {"project_id": project_id, "startTimestamp": data.startTimestamp,
                  "endTimestamp": data.endTimestamp, "density": data.density,
                  "eventThresholdNumberInGroup": 4 if data.hide_excess else 8,
                  **extra_values}
        query = cur.mogrify(pg_query, params)
        _now = time()
        logger.debug("----------------------")
        logger.debug(query)
        logger.debug("----------------------")
        cur.execute(query)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning("----------------------")
            logger.warning(query)
            logger.warning("----------------------")
        rows = cur.fetchall()

    return __transform_journey(rows=rows, reverse_path=reverse)

#
# def __compute_weekly_percentage(rows):
#     if rows is None or len(rows) == 0:
#         return rows
#     t = -1
#     for r in rows:
#         if r["week"] == 0:
#             t = r["usersCount"]
#         r["percentage"] = r["usersCount"] / t
#     return rows
#
#
# def __complete_retention(rows, start_date, end_date=None):
#     if rows is None:
#         return []
#     max_week = 10
#     for i in range(max_week):
#         if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
#             break
#         neutral = {
#             "firstConnexionWeek": start_date,
#             "week": i,
#             "usersCount": 0,
#             "connectedUsers": [],
#             "percentage": 0
#         }
#         if i < len(rows) \
#                 and i != rows[i]["week"]:
#             rows.insert(i, neutral)
#         elif i >= len(rows):
#             rows.append(neutral)
#     return rows
#
#
# def __complete_acquisition(rows, start_date, end_date=None):
#     if rows is None:
#         return []
#     max_week = 10
#     week = 0
#     delta_date = 0
#     while max_week > 0:
#         start_date += TimeUTC.MS_WEEK
#         if end_date is not None and start_date >= end_date:
#             break
#         delta = 0
#         if delta_date + week >= len(rows) \
#                 or delta_date + week < len(rows) and rows[delta_date + week]["firstConnexionWeek"] > start_date:
#             for i in range(max_week):
#                 if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
#                     break
#
#                 neutral = {
#                     "firstConnexionWeek": start_date,
#                     "week": i,
#                     "usersCount": 0,
#                     "connectedUsers": [],
#                     "percentage": 0
#                 }
#                 rows.insert(delta_date + week + i, neutral)
#                 delta = i
#         else:
#             for i in range(max_week):
#                 if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
#                     break
#
#                 neutral = {
#                     "firstConnexionWeek": start_date,
#                     "week": i,
#                     "usersCount": 0,
#                     "connectedUsers": [],
#                     "percentage": 0
#                 }
#                 if delta_date + week + i < len(rows) \
#                         and i != rows[delta_date + week + i]["week"]:
#                     rows.insert(delta_date + week + i, neutral)
#                 elif delta_date + week + i >= len(rows):
#                     rows.append(neutral)
#                 delta = i
#         week += delta
#         max_week -= 1
#         delta_date += 1
#     return rows
#
#
# def users_retention(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
#                     **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     pg_sub_query.append("DATE_TRUNC('week', to_timestamp(start_ts / 1000)) = to_timestamp(%(startTimestamp)s / 1000)")
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT FLOOR(DATE_PART('day', connexion_week - DATE_TRUNC('week', to_timestamp(%(startTimestamp)s / 1000)::timestamp)) / 7)::integer AS week,
#                                COUNT(DISTINCT connexions_list.user_id)                                     AS users_count,
#                                ARRAY_AGG(DISTINCT connexions_list.user_id)                                 AS connected_users
#                         FROM (SELECT DISTINCT user_id
#                               FROM sessions
#                               WHERE {" AND ".join(pg_sub_query)}
#                                 AND DATE_PART('week', to_timestamp((sessions.start_ts - %(startTimestamp)s)/1000)) = 1
#                                 AND NOT EXISTS((SELECT 1
#                                                 FROM sessions AS bsess
#                                                 WHERE bsess.start_ts < %(startTimestamp)s
#                                                   AND project_id =  %(project_id)s
#                                                   AND bsess.user_id = sessions.user_id
#                                                 LIMIT 1))
#                               ) AS users_list
#                                  LEFT JOIN LATERAL (SELECT DATE_TRUNC('week', to_timestamp(start_ts / 1000)::timestamp) AS connexion_week,
#                                                            user_id
#                                                     FROM sessions
#                                                     WHERE users_list.user_id = sessions.user_id
#                                                       AND %(startTimestamp)s <=sessions.start_ts
#                                                       AND sessions.project_id =  %(project_id)s
#                                                       AND sessions.start_ts < (%(endTimestamp)s - 1)
#                                                     GROUP BY connexion_week, user_id
#                             ) AS connexions_list ON (TRUE)
#                         GROUP BY week
#                         ORDER BY  week;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         print(cur.mogrify(pg_query, params))
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def users_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                       filters=[],
#                       **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT EXTRACT(EPOCH FROM first_connexion_week::date)::bigint*1000 AS first_connexion_week,
#                                FLOOR(DATE_PART('day', connexion_week - first_connexion_week) / 7)::integer AS week,
#                                COUNT(DISTINCT connexions_list.user_id)                            AS users_count,
#                                ARRAY_AGG(DISTINCT connexions_list.user_id)                        AS connected_users
#                         FROM (SELECT user_id, MIN(DATE_TRUNC('week', to_timestamp(start_ts / 1000))) AS first_connexion_week
#                               FROM sessions
#                               WHERE {" AND ".join(pg_sub_query)}
#                                 AND NOT EXISTS((SELECT 1
#                                                 FROM sessions AS bsess
#                                                 WHERE bsess.start_ts<%(startTimestamp)s
#                                                   AND project_id = %(project_id)s
#                                                   AND bsess.user_id = sessions.user_id
#                                                 LIMIT 1))
#                               GROUP BY user_id) AS users_list
#                                  LEFT JOIN LATERAL (SELECT DATE_TRUNC('week', to_timestamp(start_ts / 1000)::timestamp) AS connexion_week,
#                                                            user_id
#                                                     FROM sessions
#                                                     WHERE users_list.user_id = sessions.user_id
#                                                       AND first_connexion_week <=
#                                                           DATE_TRUNC('week', to_timestamp(sessions.start_ts / 1000)::timestamp)
#                                                       AND sessions.project_id = %(project_id)s
#                                                       AND sessions.start_ts < (%(endTimestamp)s - 1)
#                                                     GROUP BY connexion_week, user_id) AS connexions_list ON (TRUE)
#                         GROUP BY first_connexion_week, week
#                         ORDER BY first_connexion_week, week;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         print(cur.mogrify(pg_query, params))
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_retention(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                       filters=[],
#                       **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#     pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     pg_sub_query.append(f"feature.{event_column} = %(value)s")
#
#     with pg_client.PostgresClient() as cur:
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query[:-1])}
#                                 AND length({event_column}) > 2
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_query = f"""SELECT FLOOR(DATE_PART('day', connexion_week - to_timestamp(%(startTimestamp)s/1000)) / 7)::integer AS week,
#                                COUNT(DISTINCT connexions_list.user_id)                                     AS users_count,
#                                ARRAY_AGG(DISTINCT connexions_list.user_id)                                 AS connected_users
#                         FROM (SELECT DISTINCT user_id
#                               FROM sessions INNER JOIN {event_table} AS feature USING (session_id)
#                               WHERE {" AND ".join(pg_sub_query)}
#                                 AND DATE_PART('week', to_timestamp((sessions.start_ts - %(startTimestamp)s)/1000)) = 1
#                                 AND NOT EXISTS((SELECT 1
#                                                 FROM sessions AS bsess INNER JOIN {event_table} AS bfeature USING (session_id)
#                                                 WHERE bsess.start_ts<%(startTimestamp)s
#                                                   AND project_id = %(project_id)s
#                                                   AND bsess.user_id = sessions.user_id
#                                                   AND bfeature.timestamp<%(startTimestamp)s
#                                                   AND bfeature.{event_column}=%(value)s
#                                                 LIMIT 1))
#                               GROUP BY user_id) AS users_list
#                                  LEFT JOIN LATERAL (SELECT DATE_TRUNC('week', to_timestamp(start_ts / 1000)::timestamp) AS connexion_week,
#                                                            user_id
#                                                     FROM sessions INNER JOIN {event_table} AS feature USING (session_id)
#                                                     WHERE users_list.user_id = sessions.user_id
#                                                       AND %(startTimestamp)s <= sessions.start_ts
#                                                       AND sessions.project_id = %(project_id)s
#                                                       AND sessions.start_ts < (%(endTimestamp)s - 1)
#                                                       AND feature.timestamp >= %(startTimestamp)s
#                                                       AND feature.timestamp < %(endTimestamp)s
#                                                       AND feature.{event_column} = %(value)s
#                                                     GROUP BY connexion_week, user_id) AS connexions_list ON (TRUE)
#                         GROUP BY week
#                         ORDER BY week;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(cur.mogrify(pg_query, params))
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
#         "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                         filters=[],
#                         **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#     pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#
#     pg_sub_query.append(f"feature.{event_column} = %(value)s")
#
#     with pg_client.PostgresClient() as cur:
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query[:-1])}
#                                 AND length({event_column}) > 2
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_query = f"""SELECT EXTRACT(EPOCH FROM first_connexion_week::date)::bigint*1000 AS first_connexion_week,
#                                FLOOR(DATE_PART('day', connexion_week - first_connexion_week) / 7)::integer AS week,
#                                COUNT(DISTINCT connexions_list.user_id)                            AS users_count,
#                                ARRAY_AGG(DISTINCT connexions_list.user_id)                        AS connected_users
#                         FROM (SELECT user_id, DATE_TRUNC('week', to_timestamp(first_connexion_week / 1000)) AS first_connexion_week
#                               FROM(SELECT DISTINCT user_id, MIN(start_ts) AS first_connexion_week
#                                       FROM sessions INNER JOIN {event_table} AS feature USING (session_id)
#                                       WHERE {" AND ".join(pg_sub_query)}
#                                         AND NOT EXISTS((SELECT 1
#                                                         FROM sessions AS bsess INNER JOIN {event_table} AS bfeature USING (session_id)
#                                                         WHERE bsess.start_ts<%(startTimestamp)s
#                                                           AND project_id = %(project_id)s
#                                                           AND bsess.user_id = sessions.user_id
#                                                           AND bfeature.timestamp<%(startTimestamp)s
#                                                           AND bfeature.{event_column}=%(value)s
#                                                         LIMIT 1))
#                                       GROUP BY user_id) AS raw_users_list) AS users_list
#                                  LEFT JOIN LATERAL (SELECT DATE_TRUNC('week', to_timestamp(start_ts / 1000)::timestamp) AS connexion_week,
#                                                            user_id
#                                                     FROM sessions INNER JOIN {event_table} AS feature USING(session_id)
#                                                     WHERE users_list.user_id = sessions.user_id
#                                                       AND first_connexion_week <=
#                                                           DATE_TRUNC('week', to_timestamp(sessions.start_ts / 1000)::timestamp)
#                                                       AND sessions.project_id = %(project_id)s
#                                                       AND sessions.start_ts < (%(endTimestamp)s - 1)
#                                                       AND feature.timestamp >= %(startTimestamp)s
#                                                       AND feature.timestamp < %(endTimestamp)s
#                                                       AND feature.{event_column} = %(value)s
#                                                     GROUP BY connexion_week, user_id) AS connexions_list ON (TRUE)
#                         GROUP BY first_connexion_week, week
#                         ORDER BY first_connexion_week, week;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(cur.mogrify(pg_query, params))
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
#         "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_popularity_frequency(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                  filters=[],
#                                  **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     event_table = JOURNEY_TYPES["CLICK"]["table"]
#     event_column = JOURNEY_TYPES["CLICK"]["column"]
#     extra_values = {}
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_table = JOURNEY_TYPES[f["value"]]["table"]
#             event_column = JOURNEY_TYPES[f["value"]]["column"]
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT  COUNT(DISTINCT user_id) AS count
#                         FROM sessions
#                         WHERE {" AND ".join(pg_sub_query)}
#                             AND user_id IS NOT NULL;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         all_user_count = cur.fetchone()["count"]
#         if all_user_count == 0:
#             return []
#         pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#         pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#         pg_sub_query.append(f"length({event_column})>2")
#         pg_query = f"""SELECT {event_column} AS value, COUNT(DISTINCT user_id) AS count
#                     FROM {event_table} AS feature INNER JOIN sessions USING (session_id)
#                     WHERE {" AND ".join(pg_sub_query)}
#                         AND user_id IS NOT NULL
#                     GROUP BY value
#                     ORDER BY count DESC
#                     LIMIT 7;"""
#         # TODO: solve full scan
#         print(cur.mogrify(pg_query, params))
#         print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         popularity = cur.fetchall()
#         pg_query = f"""SELECT {event_column} AS value, COUNT(session_id) AS count
#                         FROM {event_table} AS feature INNER JOIN sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query)}
#                         GROUP BY value;"""
#         # TODO: solve full scan
#         print(cur.mogrify(pg_query, params))
#         print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         frequencies = cur.fetchall()
#         total_usage = sum([f["count"] for f in frequencies])
#         frequencies = {f["value"]: f["count"] for f in frequencies}
#         for p in popularity:
#             p["popularity"] = p.pop("count") / all_user_count
#             p["frequency"] = frequencies[p["value"]] / total_usage
#
#     return popularity
#
#
# def feature_adoption(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                      filters=[],
#                      **args):
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT  COUNT(DISTINCT user_id) AS count
#                         FROM sessions
#                         WHERE {" AND ".join(pg_sub_query)}
#                             AND user_id IS NOT NULL;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         all_user_count = cur.fetchone()["count"]
#         if all_user_count == 0:
#             return {"adoption": 0, "target": 0, "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                                             {"type": "EVENT_VALUE", "value": event_value}], }
#         pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#         pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query[:-1])}
#                                 AND length({event_column}) > 2
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_sub_query.append(f"feature.{event_column} = %(value)s")
#         pg_query = f"""SELECT COUNT(DISTINCT user_id) AS count
#                     FROM {event_table} AS feature INNER JOIN sessions USING (session_id)
#                     WHERE {" AND ".join(pg_sub_query)}
#                         AND user_id IS NOT NULL;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         adoption = cur.fetchone()["count"] / all_user_count
#     return {"target": all_user_count, "adoption": adoption,
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_adoption_top_users(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                filters=[], **args):
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     with pg_client.PostgresClient() as cur:
#         pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#         pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query[:-1])}
#                                 AND length({event_column}) > 2
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_sub_query.append(f"feature.{event_column} = %(value)s")
#         pg_query = f"""SELECT user_id, COUNT(DISTINCT session_id) AS count
#                         FROM {event_table} AS feature
#                                  INNER JOIN sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query)}
#                         GROUP BY 1
#                         ORDER BY 2 DESC
#                         LIMIT 10;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#     return {"users": helper.list_to_camel_case(rows),
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_adoption_daily_usage(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                  filters=[], **args):
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
#                                            chart=True, data=args)
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query_chart.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     with pg_client.PostgresClient() as cur:
#         pg_sub_query_chart.append("feature.timestamp >= %(startTimestamp)s")
#         pg_sub_query_chart.append("feature.timestamp < %(endTimestamp)s")
#         pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#         pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                         WHERE {" AND ".join(pg_sub_query)}
#                             AND length({event_column})>2
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_sub_query_chart.append(f"feature.{event_column} = %(value)s")
#         pg_query = f"""SELECT generated_timestamp       AS timestamp,
#                                COALESCE(COUNT(session_id), 0) AS count
#                         FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
#                                  LEFT JOIN LATERAL ( SELECT DISTINCT session_id
#                                                      FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                                                      WHERE {" AND ".join(pg_sub_query_chart)}
#                             ) AS users ON (TRUE)
#                         GROUP BY generated_timestamp
#                         ORDER BY generated_timestamp;"""
#         params = {"step_size": TimeUTC.MS_DAY, "project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(cur.mogrify(pg_query, params))
#         print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#     return {"chart": helper.list_to_camel_case(rows),
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_intensity(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                       filters=[],
#                       **args):
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#     pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#     event_table = JOURNEY_TYPES["CLICK"]["table"]
#     event_column = JOURNEY_TYPES["CLICK"]["column"]
#     extra_values = {}
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_table = JOURNEY_TYPES[f["value"]]["table"]
#             event_column = JOURNEY_TYPES[f["value"]]["column"]
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     pg_sub_query.append(f"length({event_column})>2")
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT {event_column} AS value, AVG(DISTINCT session_id) AS avg
#                     FROM {event_table} AS feature INNER JOIN sessions USING (session_id)
#                     WHERE {" AND ".join(pg_sub_query)}
#                     GROUP BY value
#                     ORDER BY avg DESC
#                     LIMIT 7;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # TODO: solve full scan issue
#         print(cur.mogrify(pg_query, params))
#         print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#
#     return rows
#
#
# def users_active(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                  filters=[],
#                  **args):
#     pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
#                                            chart=True, data=args)
#
#     pg_sub_query_chart.append("user_id IS NOT NULL")
#     period = "DAY"
#     extra_values = {}
#     for f in filters:
#         if f["type"] == "PERIOD" and f["value"] in ["DAY", "WEEK"]:
#             period = f["value"]
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query_chart.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT AVG(count) AS avg, JSONB_AGG(chart) AS chart
#                         FROM (SELECT generated_timestamp       AS timestamp,
#                                      COALESCE(COUNT(users), 0) AS count
#                               FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
#                                        LEFT JOIN LATERAL ( SELECT DISTINCT user_id
#                                                            FROM public.sessions
#                                                            WHERE {" AND ".join(pg_sub_query_chart)}
#                                   ) AS users ON (TRUE)
#                               GROUP BY generated_timestamp
#                               ORDER BY generated_timestamp) AS chart;"""
#         params = {"step_size": TimeUTC.MS_DAY if period == "DAY" else TimeUTC.MS_WEEK,
#                   "project_id": project_id,
#                   "startTimestamp": TimeUTC.trunc_day(startTimestamp) if period == "DAY" else TimeUTC.trunc_week(
#                       startTimestamp),
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args),
#                   **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         row_users = cur.fetchone()
#
#     return row_users
#
#
# def users_power(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                 filters=[], **args):
#     pg_sub_query = __get_constraints(project_id=project_id, time_constraint=True, chart=False, data=args)
#     pg_sub_query.append("user_id IS NOT NULL")
#
#     with pg_client.PostgresClient() as cur:
#         pg_query = f"""SELECT AVG(count) AS avg, JSONB_AGG(day_users_partition) AS partition
#                         FROM (SELECT number_of_days, COUNT(user_id) AS count
#                               FROM (SELECT user_id, COUNT(DISTINCT DATE_TRUNC('day', to_timestamp(start_ts / 1000))) AS number_of_days
#                                     FROM sessions
#                                     WHERE {" AND ".join(pg_sub_query)}
#                                     GROUP BY 1) AS users_connexions
#                               GROUP BY number_of_days
#                               ORDER BY number_of_days) AS day_users_partition;"""
#         params = {"project_id": project_id,
#                   "startTimestamp": startTimestamp, "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         # print(cur.mogrify(pg_query, params))
#         # print("---------------------")
#         cur.execute(cur.mogrify(pg_query, params))
#         row_users = cur.fetchone()
#
#     return helper.dict_to_camel_case(row_users)
#
#
# def users_slipping(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                    filters=[], **args):
#     pg_sub_query = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
#                                      time_constraint=True)
#     pg_sub_query.append("user_id IS NOT NULL")
#     pg_sub_query.append("feature.timestamp >= %(startTimestamp)s")
#     pg_sub_query.append("feature.timestamp < %(endTimestamp)s")
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f["type"] == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             pg_sub_query.append(f"sessions.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     pg_sub_query.append(f"feature.{event_column} = %(value)s")
#
#     with pg_client.PostgresClient() as cur:
#         if default:
#             # get most used value
#             pg_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                             FROM {event_table} AS feature INNER JOIN public.sessions USING (session_id)
#                             WHERE {" AND ".join(pg_sub_query[:-1])}
#                                     AND length({event_column}) > 2
#                             GROUP BY value
#                             ORDER BY count DESC
#                             LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             cur.execute(cur.mogrify(pg_query, params))
#             row = cur.fetchone()
#             if row is not None:
#                 event_value = row["value"]
#         extra_values["value"] = event_value
#         if len(event_value) > 2:
#             pg_sub_query.append(f"length({event_column})>2")
#         pg_query = f"""SELECT user_id, last_time, interactions_count, MIN(start_ts) AS first_seen, MAX(start_ts) AS last_seen
#                         FROM (SELECT user_id, MAX(timestamp) AS last_time, COUNT(DISTINCT session_id) AS interactions_count
#                               FROM {event_table} AS feature INNER JOIN sessions USING (session_id)
#                               WHERE {" AND ".join(pg_sub_query)}
#                               GROUP BY user_id) AS user_last_usage
#                                  INNER JOIN sessions USING (user_id)
#                         WHERE EXTRACT(EPOCH FROM now()) * 1000 - last_time > 7 * 24 * 60 * 60 * 1000
#                         GROUP BY user_id, last_time,interactions_count;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(cur.mogrify(pg_query, params))
#         cur.execute(cur.mogrify(pg_query, params))
#         rows = cur.fetchall()
#     return {
#         "startTimestamp": startTimestamp,
#         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
#         "list": helper.list_to_camel_case(rows)
#     }
#
#
# def search(text, feature_type, project_id, platform=None):
#     if not feature_type:
#         resource_type = "ALL"
#         data = search(text=text, feature_type=resource_type, project_id=project_id, platform=platform)
#         return data
#
#     pg_sub_query = __get_constraints(project_id=project_id, time_constraint=True, duration=True,
#                                      data={} if platform is None else {"platform": platform})
#
#     params = {"startTimestamp": TimeUTC.now() - 2 * TimeUTC.MS_MONTH,
#               "endTimestamp": TimeUTC.now(),
#               "project_id": project_id,
#               "value": helper.string_to_sql_like(text.lower()),
#               "platform_0": platform}
#     if feature_type == "ALL":
#         with pg_client.PostgresClient() as cur:
#             sub_queries = []
#             for e in JOURNEY_TYPES:
#                 sub_queries.append(f"""(SELECT DISTINCT {JOURNEY_TYPES[e]["column"]} AS value, '{e}' AS "type"
#                              FROM {JOURNEY_TYPES[e]["table"]} INNER JOIN public.sessions USING(session_id)
#                              WHERE {" AND ".join(pg_sub_query)} AND {JOURNEY_TYPES[e]["column"]} ILIKE %(value)s
#                              LIMIT 10)""")
#             pg_query = "UNION ALL".join(sub_queries)
#             # print(cur.mogrify(pg_query, params))
#             cur.execute(cur.mogrify(pg_query, params))
#             rows = cur.fetchall()
#     elif JOURNEY_TYPES.get(feature_type) is not None:
#         with pg_client.PostgresClient() as cur:
#             pg_query = f"""SELECT DISTINCT {JOURNEY_TYPES[feature_type]["column"]} AS value, '{feature_type}' AS "type"
#                              FROM {JOURNEY_TYPES[feature_type]["table"]} INNER JOIN public.sessions USING(session_id)
#                              WHERE {" AND ".join(pg_sub_query)} AND {JOURNEY_TYPES[feature_type]["column"]} ILIKE %(value)s
#                              LIMIT 10;"""
#             # print(cur.mogrify(pg_query, params))
#             cur.execute(cur.mogrify(pg_query, params))
#             rows = cur.fetchall()
#     else:
#         return []
#     return [helper.dict_to_camel_case(row) for row in rows]
