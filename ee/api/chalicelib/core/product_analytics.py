from typing import List

import schemas
from chalicelib.core.metrics import __get_basic_constraints, __get_meta_constraint
from chalicelib.core.metrics import __get_constraint_values, __complete_missing_steps
from chalicelib.utils import ch_client
from chalicelib.utils import helper, dev
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils import sql_helper as sh
from chalicelib.core import metadata
from time import time


def __transform_journey(rows):
    nodes = []
    links = []
    for r in rows:
        source = r["source_event"][r["source_event"].index("_") + 1:]
        target = r["target_event"][r["target_event"].index("_") + 1:]
        if source not in nodes:
            nodes.append(source)
        if target not in nodes:
            nodes.append(target)
        links.append({"source": nodes.index(source), "target": nodes.index(target), "value": r["value"]})
    return {"nodes": nodes, "links": sorted(links, key=lambda x: x["value"], reverse=True)}


def __transform_journey2(rows, reverse_path=False):
    # nodes should contain duplicates for different steps otherwise the UI crashes
    nodes = []
    nodes_values = []
    links = []
    for r in rows:
        source = f"{r['event_number_in_session']}_{r['event_type']}_{r['e_value']}"
        if source not in nodes:
            nodes.append(source)
            # TODO: remove this after UI supports long values
            nodes_values.append({"name": r['e_value'][:10], "eventType": r['event_type']})
        if r['next_value']:
            target = f"{r['event_number_in_session'] + 1}_{r['next_type']}_{r['next_value']}"
            if target not in nodes:
                nodes.append(target)
                # TODO: remove this after UI supports long values
                nodes_values.append({"name": r['next_value'][:10], "eventType": r['next_type']})
            link = {"eventType": r['event_type'], "value": r["sessions_count"],
                    "avgTimeToTarget": r["avg_time_to_target"]}
            if not reverse_path:
                link["source"] = nodes.index(source)
                link["target"] = nodes.index(target)
            else:
                link["source"] = nodes.index(target)
                link["target"] = nodes.index(source)
            links.append(link)

    return {"nodes": nodes_values,
            "links": sorted(links, key=lambda x: x["value"], reverse=True)}


JOURNEY_TYPES = {
    schemas.ProductAnalyticsSelectedEventType.location: {"eventType": "LOCATION", "column": "url_path"},
    schemas.ProductAnalyticsSelectedEventType.click: {"eventType": "CLICK", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.input: {"eventType": "INPUT", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.custom_event: {"eventType": "CUSTOM", "column": "name"}
}


def path_analysis(project_id: int, data: schemas.CardPathAnalysis):
    sub_events = []
    start_points_conditions = []
    if len(data.metric_value) == 0:
        data.metric_value.append(schemas.ProductAnalyticsSelectedEventType.location)
        sub_events.append({"column": JOURNEY_TYPES[schemas.ProductAnalyticsSelectedEventType.location]["column"],
                           "eventType": schemas.ProductAnalyticsSelectedEventType.location.value})
    else:
        for v in data.metric_value:
            if JOURNEY_TYPES.get(v):
                sub_events.append({"column": JOURNEY_TYPES[v]["column"],
                                   "eventType": JOURNEY_TYPES[v]["eventType"]})
    if len(sub_events) == 1:
        main_column = sub_events[0]['column']
    else:
        main_column = f"multiIf(%s,%s)" % (
            ','.join([f"event_type='{s['eventType']}',{s['column']}" for s in sub_events[:-1]]),
            sub_events[-1]["column"])
    extra_values = {}
    reverse = data.start_type == "end"
    for i, sf in enumerate(data.start_point):
        f_k = f"start_point_{i}"
        op = sh.get_sql_operator(sf.operator)
        is_not = sh.is_negation_operator(sf.operator)
        extra_values = {**extra_values, **sh.multi_values(sf.value, value_key=f_k)}
        start_points_conditions.append(f"(event_type='{JOURNEY_TYPES[sf.type]['eventType']}' AND " +
                                       sh.multi_conditions(f'e_value {op} %({f_k})s', sf.value, is_not=is_not,
                                                           value_key=f_k)
                                       + ")")

    exclusions = {}
    for i, sf in enumerate(data.exclude):
        if sf.type in data.metric_value:
            f_k = f"exclude_{i}"
            extra_values = {**extra_values, **sh.multi_values(sf.value, value_key=f_k)}
            exclusions[sf.type] = [
                sh.multi_conditions(f'{JOURNEY_TYPES[sf.type]["column"]} != %({f_k})s', sf.value, is_not=True,
                                    value_key=f_k)]

    sessions_conditions = []
    meta_keys = None
    for i, f in enumerate(data.series[0].filter.filters):
        op = sh.get_sql_operator(f.operator)
        is_any = sh.isAny_opreator(f.operator)
        is_not = sh.is_negation_operator(f.operator)
        is_undefined = sh.isUndefined_operator(f.operator)
        f_k = f"f_value_{i}"
        extra_values = {**extra_values, **sh.multi_values(f.value, value_key=f_k)}

        # ---- meta-filters
        if f.type == schemas.FilterType.user_browser:
            if is_any:
                sessions_conditions.append('isNotNull(user_browser)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_os]:
            if is_any:
                sessions_conditions.append('isNotNull(user_os)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_device]:
            if is_any:
                sessions_conditions.append('isNotNull(user_device)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_country]:
            if is_any:
                sessions_conditions.append('isNotNull(user_country)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.user_city:
            if is_any:
                sessions_conditions.append('isNotNull(user_city)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.user_state:
            if is_any:
                sessions_conditions.append('isNotNull(user_state)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.utm_source]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_source)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_source)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.utm_medium]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_medium)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_medium)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.utm_campaign]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_campaign)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_campaign)')
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
                sessions_conditions.append('isNotNull(base_referrer)')
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
                    sessions_conditions.append(f"isNotNull({metadata.index_to_colname(meta_keys[f.source])})")
                elif is_undefined:
                    sessions_conditions.append(f"isNull({metadata.index_to_colname(meta_keys[f.source])})")
                else:
                    sessions_conditions.append(
                        sh.multi_conditions(
                            f"{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                            f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            if is_any:
                sessions_conditions.append('isNotNull(user_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(user_id)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"s.user_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.user_anonymous_id,
                        schemas.FilterType.user_anonymous_id_ios]:
            if is_any:
                sessions_conditions.append('isNotNull(user_anonymous_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(user_anonymous_id)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
            if is_any:
                sessions_conditions.append('isNotNull(rev_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(rev_id)')
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

    # ch_sub_query = __get_basic_constraints(table_name="experimental.events", data=data.model_dump())
    ch_sub_query = __get_basic_constraints(table_name="events")
    selected_event_type_sub_query = []
    for s in data.metric_value:
        selected_event_type_sub_query.append(f"events.event_type = '{JOURNEY_TYPES[s]['eventType']}'")
        if s in exclusions:
            selected_event_type_sub_query[-1] += " AND (" + " AND ".join(exclusions[s]) + ")"
    selected_event_type_sub_query = " OR ".join(selected_event_type_sub_query)
    ch_sub_query.append(f"({selected_event_type_sub_query})")

    main_table = "experimental.events"
    if len(sessions_conditions) > 0:
        sessions_conditions.append(f"sessions.project_id = %(project_id)s")
        sessions_conditions.append(f"sessions.datetime >= toDateTime(%(startTimestamp)s / 1000)")
        sessions_conditions.append(f"sessions.datetime < toDateTime(%(endTimestamp)s / 1000)")
        sessions_conditions.append("sessions.events_count>1")
        sessions_conditions.append("sessions.duration>0")
        main_table = f"""(SELECT DISTINCT session_id
                        FROM sessions
                        WHERE {" AND ".join(sessions_conditions)}) AS sub_sessions 
                            INNER JOIN events USING (session_id)"""
    if len(start_points_conditions) == 0:
        start_points_subquery = """SELECT DISTINCT session_id
                        FROM (SELECT event_type, e_value
                              FROM full_ranked_events
                              WHERE event_number_in_session = 1
                              GROUP BY event_type, e_value
                              ORDER BY count(1) DESC
                              LIMIT 2) AS top_start_events
                                 INNER JOIN full_ranked_events
                                            ON (top_start_events.event_type = full_ranked_events.event_type AND
                                                top_start_events.e_value = full_ranked_events.e_value AND
                                                full_ranked_events.event_number_in_session = 1 AND
                                                isNotNull(next_value))"""
    else:
        start_points_conditions = ["(" + " OR ".join(start_points_conditions) + ")",
                                   "event_number_in_session = 1",
                                   "isNotNull(next_value)"]
        start_points_subquery = f"""SELECT DISTINCT session_id
                                    FROM full_ranked_events
                                    WHERE {" AND ".join(start_points_conditions)}"""
    del start_points_conditions
    if reverse:
        path_direction = "DESC"
    else:
        path_direction = ""

    with ch_client.ClickHouseClient(database="experimental") as ch:
        ch_query = f"""\
WITH full_ranked_events AS (SELECT session_id,
                                   event_type,
                                   {main_column}  AS e_value,
                                   row_number() OVER (PARTITION BY session_id ORDER BY datetime {path_direction},message_id {path_direction}) AS event_number_in_session,
                                   leadInFrame(label)
                                               OVER (PARTITION BY session_id ORDER BY datetime {path_direction},message_id {path_direction} ROWS
                                                   BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)         AS next_value,
                                   leadInFrame(toNullable(event_type))
                                               OVER (PARTITION BY session_id ORDER BY datetime {path_direction},message_id {path_direction} ROWS
                                                   BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)         AS next_type,
                                   abs(leadInFrame(toNullable(datetime))
                                                   OVER (PARTITION BY session_id ORDER BY datetime {path_direction},message_id {path_direction} ROWS
                                                       BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) -
                                       events.datetime)                                                         AS time_to_next
                            FROM {main_table}
                            WHERE {" AND ".join(ch_sub_query)})
SELECT event_number_in_session,
       event_type,
       e_value,
       next_type,
       next_value,
       sessions_count,
       avg(time_to_next) AS avg_time_to_target
FROM (SELECT *
      FROM (SELECT *,
                   row_number()
                           OVER (PARTITION BY event_number_in_session, event_type, e_value ORDER BY sessions_count DESC ) AS _event_number_in_group
            FROM (SELECT event_number_in_session,
                         event_type,
                         e_value,
                         next_type,
                         next_value,
                         time_to_next,
                         count(1) AS sessions_count
                  FROM ({start_points_subquery}) AS start_points
                           INNER JOIN full_ranked_events USING (session_id)
                  GROUP BY event_number_in_session, event_type, e_value, next_type, next_value,
                           time_to_next) AS groupped_events) AS ranked_groupped_events
      WHERE _event_number_in_group < 9) AS limited_events
GROUP BY event_number_in_session, event_type, e_value, next_type, next_value, sessions_count
ORDER BY event_number_in_session, e_value, next_value;"""
        params = {"project_id": project_id, "startTimestamp": data.startTimestamp,
                  "endTimestamp": data.endTimestamp,
                  # **__get_constraint_values(args),
                  **extra_values}

        _now = time()
        rows = ch.execute(query=ch_query, params=params)
        if time() - _now > 3:
            print(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            print("----------------------")
            print(print(ch.format(ch_query, params)))
            print("----------------------")

    return __transform_journey2(rows=rows, reverse_path=reverse)

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
#     ch_sub_query = __get_basic_constraints(table_name='sessions_metadata', data=args)
#     meta_condition = __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
#     ch_sub_query.append("not empty(sessions_metadata.user_id)")
#     with ch_client.ClickHouseClient() as ch:
#         ch_query = f"""SELECT toInt8((connexion_week - toDate(%(startTimestamp)s / 1000)) / 7) AS week,
#                                COUNT(all_connexions.user_id)             AS users_count,
#                                groupArray(100)(all_connexions.user_id)            AS connected_users
#                         FROM (SELECT DISTINCT user_id
#                               FROM sessions_metadata
#                               WHERE {" AND ".join(ch_sub_query)}
#                                 AND toStartOfWeek(sessions_metadata.datetime,1) = toDate(%(startTimestamp)s / 1000)
#                                 AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                 AND isNull((SELECT 1
#                                             FROM sessions_metadata AS bmsess
#                                             WHERE bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                               AND bmsess.project_id = %(project_id)s
#                                               AND bmsess.user_id = sessions_metadata.user_id
#                                             LIMIT 1))
#                                  ) AS users_list
#                                  INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime,1) AS connexion_week
#                                              FROM sessions_metadata
#                                              WHERE {" AND ".join(ch_sub_query)}
#                             ) AS all_connexions USING (user_id)
#                         GROUP BY connexion_week
#                         ORDER BY connexion_week;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         # print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def users_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                       filters=[], **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     ch_sub_query = __get_basic_constraints(table_name='sessions_metadata', data=args)
#     meta_condition = __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
#     ch_sub_query.append("not empty(sessions_metadata.user_id)")
#     ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s / 1000)")
#     with ch_client.ClickHouseClient() as ch:
#         ch_query = f"""SELECT toUnixTimestamp(toDateTime(first_connexion_week))*1000 AS first_connexion_week,
#                            week,
#                            users_count,
#                            connected_users
#                     FROM (
#                             SELECT first_connexion_week,
#                                    toInt8((connexion_week - first_connexion_week) / 7) AS week,
#                                    COUNT(DISTINCT all_connexions.user_id)              AS users_count,
#                                    groupArray(20)(all_connexions.user_id)             AS connected_users
#                             FROM (SELECT user_id, MIN(toStartOfWeek(sessions_metadata.datetime, 1)) AS first_connexion_week
#                                   FROM sessions_metadata
#                                   WHERE {" AND ".join(ch_sub_query)}
#                                     AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                     AND isNull((SELECT 1
#                                                 FROM sessions_metadata AS bmsess
#                                                 WHERE bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                                   AND bmsess.project_id = %(project_id)s
#                                                   AND bmsess.user_id = sessions_metadata.user_id
#                                                 LIMIT 1))
#                                   GROUP BY user_id) AS users_list
#                                      INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime, 1) AS connexion_week
#                                                  FROM sessions_metadata
#                                                  WHERE {" AND ".join(ch_sub_query)}
#                                                  ORDER BY connexion_week, user_id
#                                 ) AS all_connexions USING (user_id)
#                             WHERE first_connexion_week <= connexion_week
#                             GROUP BY first_connexion_week, week
#                             ORDER BY first_connexion_week, week
#                     ) AS full_data;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         # print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_retention(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                       filters=[], **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
#     meta_condition = __get_meta_constraint(args)
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                             FROM {event_table} AS feature
#                                 {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                             WHERE {" AND ".join(ch_sub_query)}
#                             GROUP BY value
#                             ORDER BY count DESC
#                             LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             # print(ch_query% params)
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             else:
#                 print(f"no {event_table} most used value")
#                 return {
#                     "startTimestamp": startTimestamp,
#                     "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                 {"type": "EVENT_VALUE", "value": ""}],
#                     "chart": __complete_retention(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
#                 }
#         extra_values["value"] = event_value
#         if len(meta_condition) == 0:
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#         ch_sub_query += meta_condition
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT toInt8((connexion_week - toDate(%(startTimestamp)s / 1000)) / 7) AS week,
#                                COUNT(DISTINCT all_connexions.user_id)             AS users_count,
#                                groupArray(100)(all_connexions.user_id)            AS connected_users
#                         FROM (SELECT DISTINCT user_id
#                               FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                               WHERE {" AND ".join(ch_sub_query)}
#                                 AND toStartOfWeek(feature.datetime,1) = toDate(%(startTimestamp)s / 1000)
#                                 AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                 AND feature.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                 AND isNull((SELECT 1
#                                             FROM {event_table} AS bsess INNER JOIN sessions_metadata AS bmsess USING (session_id)
#                                             WHERE bsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                               AND bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                               AND bsess.project_id = %(project_id)s
#                                               AND bmsess.project_id = %(project_id)s
#                                               AND bmsess.user_id = sessions_metadata.user_id
#                                               AND bsess.{event_column}=%(value)s
#                                             LIMIT 1))
#                                  ) AS users_list
#                                  INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime,1) AS connexion_week
#                                              FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                                              WHERE {" AND ".join(ch_sub_query)}
#                                              ORDER BY connexion_week, user_id
#                             ) AS all_connexions USING (user_id)
#                         GROUP BY connexion_week
#                         ORDER BY connexion_week;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
#         "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                         filters=[], **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
#     meta_condition = __get_meta_constraint(args)
#
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                             FROM {event_table} AS feature
#                                     {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                             WHERE {" AND ".join(ch_sub_query)}
#                             GROUP BY value
#                             ORDER BY count DESC
#                             LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             # print(ch_query% params)
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             else:
#                 print(f"no {event_table} most used value")
#                 return {
#                     "startTimestamp": startTimestamp,
#                     "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                 {"type": "EVENT_VALUE", "value": ""}],
#                     "chart": __complete_acquisition(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
#                 }
#         extra_values["value"] = event_value
#
#         if len(meta_condition) == 0:
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#
#         ch_sub_query += meta_condition
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT toUnixTimestamp(toDateTime(first_connexion_week))*1000 AS first_connexion_week,
#                                week,
#                                users_count,
#                                connected_users
#                         FROM (
#                                 SELECT first_connexion_week,
#                                        toInt8((connexion_week - first_connexion_week) / 7) AS week,
#                                        COUNT(DISTINCT all_connexions.user_id)              AS users_count,
#                                        groupArray(100)(all_connexions.user_id)             AS connected_users
#                                 FROM (SELECT user_id, MIN(toStartOfWeek(feature.datetime, 1)) AS first_connexion_week
#                                       FROM sessions_metadata INNER JOIN {event_table} AS feature USING (session_id)
#                                       WHERE {" AND ".join(ch_sub_query)}
#                                         AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                         AND feature.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
#                                         AND isNull((SELECT 1
#                                                     FROM sessions_metadata AS bmsess
#                                                         INNER JOIN {event_table} AS bsess USING (session_id)
#                                                     WHERE bsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                                       AND bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
#                                                       AND bsess.project_id = %(project_id)s
#                                                       AND bmsess.project_id = %(project_id)s
#                                                       AND bmsess.user_id = sessions_metadata.user_id
#                                                       AND bsess.{event_column} = %(value)s
#                                                     LIMIT 1))
#                                       GROUP BY user_id) AS users_list
#                                          INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime, 1) AS connexion_week
#                                                      FROM sessions_metadata INNER JOIN {event_table} AS feature USING (session_id)
#                                                      WHERE {" AND ".join(ch_sub_query)}
#                                                      ORDER BY connexion_week, user_id
#                                     ) AS all_connexions USING (user_id)
#                                 WHERE first_connexion_week <= connexion_week
#                                 GROUP BY first_connexion_week, week
#                                 ORDER BY first_connexion_week, week
#                         ) AS full_data;"""
#
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#         rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
#     return {
#         "startTimestamp": startTimestamp,
#         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
#         "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
#     }
#
#
# def feature_popularity_frequency(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                  filters=[], **args):
#     startTimestamp = TimeUTC.trunc_week(startTimestamp)
#     endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
#     ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
#     meta_condition = __get_meta_constraint(args)
#
#     event_table = JOURNEY_TYPES["CLICK"]["table"]
#     event_column = JOURNEY_TYPES["CLICK"]["column"]
#     extra_values = {}
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_table = JOURNEY_TYPES[f["value"]]["table"]
#             event_column = JOURNEY_TYPES[f["value"]]["column"]
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#
#     with ch_client.ClickHouseClient() as ch:
#         if len(meta_condition) == 0:
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#         ch_sub_query += meta_condition
#         ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
#                         FROM sessions_metadata
#                         WHERE {" AND ".join(meta_condition)};"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         # print("---------------------")
#         all_user_count = ch.execute(ch_query, params)
#         if len(all_user_count) == 0 or all_user_count[0]["count"] == 0:
#             return []
#         all_user_count = all_user_count[0]["count"]
#         ch_query = f"""SELECT {event_column} AS value, COUNT(DISTINCT user_id) AS count
#                     FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                     WHERE {" AND ".join(ch_sub_query)}
#                         AND length({event_column})>2
#                     GROUP BY value
#                     ORDER BY count DESC
#                     LIMIT 7;"""
#
#         # print(ch_query % params)
#         # print("---------------------")
#         popularity = ch.execute(ch_query, params)
#         params["values"] = [p["value"] for p in popularity]
#         if len(params["values"]) == 0:
#             return []
#         ch_query = f"""SELECT {event_column} AS value, COUNT(session_id) AS count
#                         FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                         WHERE {" AND ".join(ch_sub_query)}
#                             AND {event_column} IN %(values)s
#                         GROUP BY value;"""
#
#         # print(ch_query % params)
#         # print("---------------------")
#         frequencies = ch.execute(ch_query, params)
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
#                      filters=[], **args):
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     meta_condition = []
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#
#     ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
#     meta_condition += __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature
#                             {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                         WHERE {" AND ".join(ch_sub_query)}
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             # print(ch_query % params)
#             # print("---------------------")
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             # else:
#             #     print(f"no {event_table} most used value")
#             #     return {"target": 0, "adoption": 0,
#             #             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": ""}]}
#
#         extra_values["value"] = event_value
#
#         if len(meta_condition) == 0:
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             ch_sub_query += meta_condition
#         ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
#                                 FROM sessions_metadata
#                                 WHERE {" AND ".join(meta_condition)};"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         # print("---------------------")
#         all_user_count = ch.execute(ch_query, params)
#         if len(all_user_count) == 0 or all_user_count[0]["count"] == 0:
#             return {"adoption": 0, "target": 0, "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                                             {"type": "EVENT_VALUE", "value": event_value}], }
#         all_user_count = all_user_count[0]["count"]
#
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
#                     FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                     WHERE {" AND ".join(ch_sub_query)};"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         # print("---------------------")
#         adoption = ch.execute(ch_query, params)
#         adoption = adoption[0]["count"] / all_user_count
#     return {"target": all_user_count, "adoption": adoption,
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_adoption_top_users(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                filters=[], **args):
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     meta_condition = []
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("user_id IS NOT NULL")
#             meta_condition.append("not empty(sessions_metadata.user_id)")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
#     meta_condition += __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                         FROM {event_table} AS feature
#                             {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                         WHERE {" AND ".join(ch_sub_query)}
#                         GROUP BY value
#                         ORDER BY count DESC
#                         LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             else:
#                 print(f"no {event_table} most used value")
#                 return {"users": [],
#                         "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": ""}]}
#
#         extra_values["value"] = event_value
#         if len(meta_condition) == 0:
#             ch_sub_query.append("user_id IS NOT NULL")
#             ch_sub_query.append("not empty(sessions_metadata.user_id)")
#             ch_sub_query.append("sessions_metadata.project_id = %(project_id)s")
#             ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             ch_sub_query.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT user_id, COUNT(DISTINCT session_id) AS count
#                         FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                         WHERE {" AND ".join(ch_sub_query)}
#                         GROUP BY user_id
#                         ORDER BY count DESC
#                         LIMIT 10;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#     return {"users": helper.list_to_camel_case(rows),
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_adoption_daily_usage(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
#                                  filters=[], **args):
#     event_type = "CLICK"
#     event_value = '/'
#     extra_values = {}
#     default = True
#     meta_condition = []
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#     ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
#     meta_condition += __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                             FROM {event_table} AS feature {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                             WHERE {" AND ".join(ch_sub_query)}
#                                 AND length({event_column}) > 2
#                             GROUP BY value
#                             ORDER BY count DESC
#                             LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             # print(ch_query % params)
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             else:
#                 print(f"no {event_table} most used value")
#                 return {
#                     "startTimestamp": startTimestamp,
#                     "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                 {"type": "EVENT_VALUE", "value": ""}],
#                     "chart": __complete_acquisition(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
#                 }
#         extra_values["value"] = event_value
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT toUnixTimestamp(day)*1000 AS timestamp, count
#                         FROM (SELECT toStartOfDay(feature.datetime) AS day, COUNT(DISTINCT session_id) AS count
#                               FROM {event_table} AS feature {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                               WHERE {" AND ".join(ch_sub_query)}
#                               GROUP BY day
#                               ORDER BY day) AS raw_results;"""
#         params = {"step_size": TimeUTC.MS_DAY, "project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#     return {"chart": __complete_missing_steps(rows=rows, start_time=startTimestamp, end_time=endTimestamp,
#                                               density=(endTimestamp - startTimestamp) // TimeUTC.MS_DAY,
#                                               neutral={"count": 0}),
#             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}
#
#
# def feature_intensity(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
#                       **args):
#     event_table = JOURNEY_TYPES["CLICK"]["table"]
#     event_column = JOURNEY_TYPES["CLICK"]["column"]
#     extra_values = {}
#     meta_condition = []
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_table = JOURNEY_TYPES[f["value"]]["table"]
#             event_column = JOURNEY_TYPES[f["value"]]["column"]
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#     ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
#     meta_condition += __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     with ch_client.ClickHouseClient() as ch:
#         ch_query = f"""SELECT {event_column} AS value, AVG(DISTINCT session_id) AS avg
#                     FROM {event_table} AS feature
#                         {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                     WHERE {" AND ".join(ch_sub_query)}
#                     GROUP BY value
#                     ORDER BY avg DESC
#                     LIMIT 7;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         # print(ch_query % params)
#         rows = ch.execute(ch_query, params)
#
#     return rows
#
#
# PERIOD_TO_FUNCTION = {
#     "DAY": "toStartOfDay",
#     "WEEK": "toStartOfWeek"
# }
#
#
# def users_active(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
#                  **args):
#     meta_condition = __get_meta_constraint(args)
#     period = "DAY"
#     extra_values = {}
#     for f in filters:
#         if f.type == "PERIOD" and f["value"] in ["DAY", "WEEK"]:
#             period = f["value"]
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             extra_values["user_id"] = f["value"]
#     period_function = PERIOD_TO_FUNCTION[period]
#     ch_sub_query = __get_basic_constraints(table_name="sessions_metadata", data=args)
#     ch_sub_query += meta_condition
#     ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
#     ch_sub_query.append("not empty(sessions_metadata.user_id)")
#     with ch_client.ClickHouseClient() as ch:
#         ch_query = f"""SELECT SUM(count) / intDiv(%(endTimestamp)s - %(startTimestamp)s, %(step_size)s) AS avg
#                         FROM (SELECT {period_function}(sessions_metadata.datetime) AS period, count(DISTINCT user_id) AS count
#                               FROM sessions_metadata
#                               WHERE {" AND ".join(ch_sub_query)}
#                               GROUP BY period) AS daily_users;"""
#         params = {"step_size": TimeUTC.MS_DAY if period == "DAY" else TimeUTC.MS_WEEK,
#                   "project_id": project_id,
#                   "startTimestamp": TimeUTC.trunc_day(startTimestamp) if period == "DAY" else TimeUTC.trunc_week(
#                       startTimestamp), "endTimestamp": endTimestamp, **__get_constraint_values(args),
#                   **extra_values}
#         # print(ch_query % params)
#         # print("---------------------")
#         avg = ch.execute(ch_query, params)
#         if len(avg) == 0 or avg[0]["avg"] == 0:
#             return {"avg": 0, "chart": []}
#         avg = avg[0]["avg"]
#         # TODO: optimize this when DB structure changes, optimization from 3s to 1s
#         ch_query = f"""SELECT toUnixTimestamp(toDateTime(period))*1000 AS timestamp, count
#                         FROM (SELECT {period_function}(sessions_metadata.datetime) AS period, count(DISTINCT user_id) AS count
#                               FROM sessions_metadata
#                               WHERE {" AND ".join(ch_sub_query)}
#                               GROUP BY period
#                               ORDER BY period) AS raw_results;"""
#         # print(ch_query % params)
#         # print("---------------------")
#         rows = ch.execute(ch_query, params)
#     return {"avg": avg, "chart": rows}
#
#
# def users_power(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[], **args):
#     ch_sub_query = __get_basic_constraints(table_name="sessions_metadata", data=args)
#     meta_condition = __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
#     ch_sub_query.append("not empty(sessions_metadata.user_id)")
#
#     with ch_client.ClickHouseClient() as ch:
#         ch_query = f"""SELECT ifNotFinite(AVG(count),0) AS avg
#                         FROM(SELECT COUNT(user_id) AS count
#                         FROM (SELECT user_id, COUNT(DISTINCT toStartOfDay(datetime)) AS number_of_days
#                               FROM sessions_metadata
#                               WHERE {" AND ".join(ch_sub_query)}
#                               GROUP BY user_id) AS users_connexions
#                         GROUP BY number_of_days
#                         ORDER BY number_of_days) AS results;"""
#         params = {"project_id": project_id,
#                   "startTimestamp": startTimestamp, "endTimestamp": endTimestamp, **__get_constraint_values(args)}
#         # print(ch_query % params)
#         # print("---------------------")
#         avg = ch.execute(ch_query, params)
#         if len(avg) == 0 or avg[0]["avg"] == 0:
#             return {"avg": 0, "partition": []}
#         avg = avg[0]["avg"]
#         ch_query = f"""SELECT number_of_days, COUNT(user_id) AS count
#                         FROM (SELECT user_id, COUNT(DISTINCT toStartOfDay(datetime)) AS number_of_days
#                               FROM sessions_metadata
#                               WHERE {" AND ".join(ch_sub_query)}
#                               GROUP BY user_id) AS users_connexions
#                         GROUP BY number_of_days
#                         ORDER BY number_of_days;"""
#
#         # print(ch_query % params)
#         # print("---------------------")
#         rows = ch.execute(ch_query, params)
#
#     return {"avg": avg, "partition": helper.list_to_camel_case(rows)}
#
#
# def users_slipping(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
#                    **args):
#     ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
#     event_type = "PAGES"
#     event_value = "/"
#     extra_values = {}
#     default = True
#     meta_condition = []
#     for f in filters:
#         if f.type == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
#             event_type = f["value"]
#         elif f.type == "EVENT_VALUE":
#             event_value = f["value"]
#             default = False
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
#             meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
#             meta_condition.append("sessions_metadata.project_id = %(project_id)s")
#             meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#             extra_values["user_id"] = f["value"]
#     event_table = JOURNEY_TYPES[event_type]["table"]
#     event_column = JOURNEY_TYPES[event_type]["column"]
#
#     meta_condition += __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     with ch_client.ClickHouseClient() as ch:
#         if default:
#             # get most used value
#             ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
#                             FROM {event_table} AS feature
#                                 {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
#                             WHERE {" AND ".join(ch_sub_query)}
#                             GROUP BY value
#                             ORDER BY count DESC
#                             LIMIT 1;"""
#             params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                       "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#             print(ch_query % params)
#             row = ch.execute(ch_query, params)
#             if len(row) > 0:
#                 event_value = row[0]["value"]
#             else:
#                 print(f"no {event_table} most used value")
#                 return {
#                     "startTimestamp": startTimestamp,
#                     "filters": [{"type": "EVENT_TYPE", "value": event_type},
#                                 {"type": "EVENT_VALUE", "value": ""}],
#                     "list": []
#                 }
#         extra_values["value"] = event_value
#         if len(meta_condition) == 0:
#             ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
#             ch_sub_query.append("not empty(sessions_metadata.user_id)")
#             ch_sub_query.append("sessions_metadata.project_id = %(project_id)s")
#             ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
#             ch_sub_query.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
#         ch_sub_query.append(f"feature.{event_column} = %(value)s")
#         ch_query = f"""SELECT user_id,
#                                toUnixTimestamp(last_time)*1000 AS last_time,
#                                interactions_count,
#                                toUnixTimestamp(first_seen) * 1000 AS first_seen,
#                                toUnixTimestamp(last_seen) * 1000  AS last_seen
#                         FROM (SELECT user_id, last_time, interactions_count, MIN(datetime) AS first_seen, MAX(datetime) AS last_seen
#                               FROM (SELECT user_id, MAX(datetime) AS last_time, COUNT(DISTINCT session_id) AS interactions_count
#                                     FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
#                                     WHERE {" AND ".join(ch_sub_query)}
#                                     GROUP BY user_id ) AS user_last_usage INNER JOIN sessions_metadata USING (user_id)
#                               WHERE now() - last_time > 7
#                               GROUP BY user_id, last_time, interactions_count
#                               ORDER BY interactions_count DESC, last_time DESC
#                               LIMIT 50) AS raw_results;"""
#         params = {"project_id": project_id, "startTimestamp": startTimestamp,
#                   "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
#         print(ch_query % params)
#         rows = ch.execute(ch_query, params)
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
#     args = {} if platform is None else {"platform": platform}
#     ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
#     meta_condition = __get_meta_constraint(args)
#     ch_sub_query += meta_condition
#     params = {"startTimestamp": TimeUTC.now() - 1 * TimeUTC.MS_MONTH,
#               "endTimestamp": TimeUTC.now(),
#               "project_id": project_id,
#               "value": text.lower(),
#               "platform_0": platform}
#     if feature_type == "ALL":
#         with ch_client.ClickHouseClient() as ch:
#             sub_queries = []
#             for e in JOURNEY_TYPES:
#                 sub_queries.append(f"""(SELECT DISTINCT {JOURNEY_TYPES[e]["column"]} AS value, '{e}' AS "type"
#                              FROM {JOURNEY_TYPES[e]["table"]} AS feature
#                              WHERE {" AND ".join(ch_sub_query)} AND positionUTF8({JOURNEY_TYPES[e]["column"]},%(value)s)!=0
#                              LIMIT 10)""")
#             ch_query = "UNION ALL".join(sub_queries)
#             print(ch_query % params)
#             rows = ch.execute(ch_query, params)
#     elif JOURNEY_TYPES.get(feature_type) is not None:
#         with ch_client.ClickHouseClient() as ch:
#             ch_query = f"""SELECT DISTINCT {JOURNEY_TYPES[feature_type]["column"]} AS value, '{feature_type}' AS "type"
#                              FROM {JOURNEY_TYPES[feature_type]["table"]} AS feature
#                              WHERE {" AND ".join(ch_sub_query)} AND positionUTF8({JOURNEY_TYPES[feature_type]["column"]},%(value)s)!=0
#                              LIMIT 10;"""
#             print(ch_query % params)
#             rows = ch.execute(ch_query, params)
#     else:
#         return []
#     return [helper.dict_to_camel_case(row) for row in rows]
