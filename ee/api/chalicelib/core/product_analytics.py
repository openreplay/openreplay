import schemas
from chalicelib.core.metrics import __get_basic_constraints, __get_meta_constraint
from chalicelib.core.metrics import __get_constraint_values, __complete_missing_steps
from chalicelib.utils import ch_client
from chalicelib.utils import helper, dev
from chalicelib.utils.TimeUTC import TimeUTC


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


JOURNEY_DEPTH = 5
JOURNEY_TYPES = {
    "PAGES": {"table": "pages", "column": "url_path"},
    "CLICK": {"table": "clicks", "column": "label"},
    # TODO: support input event
    "EVENT": {"table": "customs", "column": "name"}
}


def path_analysis(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(), filters=[],
                  **args):
    event_start = None
    event_table = JOURNEY_TYPES["CLICK"]["table"]
    event_column = JOURNEY_TYPES["CLICK"]["column"]
    extra_values = {}
    meta_condition = []
    # TODO: support multi-value
    for f in filters:
        if f["type"] == "START_POINT":
            event_start = f["value"]
        elif f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_table = JOURNEY_TYPES[f["value"]]["table"]
            event_column = JOURNEY_TYPES[f["value"]]["column"]
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append(f"sessions_metadata.project_id = %(project_id)s")
            meta_condition.append(f"sessions_metadata.datetime >= toDateTime(%(startTimestamp)s / 1000)")
            meta_condition.append(f"sessions_metadata.datetime < toDateTime(%(endTimestamp)s / 1000)")
            extra_values["user_id"] = f["value"]
    ch_sub_query = __get_basic_constraints(table_name=event_table, data=args)
    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT source_event,
                               target_event,
                               count(*) AS    value
                        FROM (SELECT toString(event_number) || '_' || value                   AS target_event,
                                     lagInFrame(toString(event_number) || '_' || value) OVER (PARTITION BY session_rank ORDER BY datetime ASC ROWS
                                         BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS source_event
                              FROM (SELECT session_rank,
                                           datetime,
                                           value,
                                           row_number AS event_number
                                    FROM (SELECT session_rank,
                                                 groupArray(datetime)         AS arr_datetime,
                                                 groupArray(value)            AS arr_value,
                                                 arrayEnumerate(arr_datetime) AS row_number
                                               {f"FROM (SELECT * FROM (SELECT *, MIN(mark) OVER ( PARTITION BY session_id , session_rank ORDER BY datetime ) AS max FROM (SELECT *, CASE WHEN value = %(event_start)s THEN datetime ELSE NULL END as mark" if event_start else ""}
                                          FROM (SELECT session_id,
                                                       datetime,
                                                       value,
                                                       SUM(new_session) OVER (ORDER BY session_id, datetime) AS session_rank
                                                FROM (SELECT *,
                                                             if(equals(source_timestamp, '1970-01-01'), 1, 0) AS new_session
                                                      FROM (SELECT session_id,
                                                                   datetime,
                                                                   {event_column} AS             value,
                                                                   lagInFrame(datetime) OVER (PARTITION BY session_id ORDER BY datetime ASC ROWS 
                                                                            BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS source_timestamp
                                                            FROM {event_table} {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                                            WHERE {" AND ".join(ch_sub_query)}
                                                            ORDER BY session_id, datetime) AS related_events) AS ranked_events
                                                ORDER BY session_rank, datetime
                                                   ) AS processed
                                           {") AS marked) AS maxed WHERE datetime >= max) AS filtered" if event_start else ""}
                                          GROUP BY session_rank
                                          ORDER BY session_rank)
                                        ARRAY JOIN
                                         arr_datetime AS datetime,
                                         arr_value AS value,
                                        row_number
                                    ORDER BY session_rank ASC,
                                             row_number ASC) AS sorted_events
                              WHERE event_number <= %(JOURNEY_DEPTH)s) AS final
                        WHERE not empty(source_event)
                            AND not empty(target_event)
                        GROUP BY source_event, target_event
                        ORDER BY value DESC
                        LIMIT 20;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, "event_start": event_start, "JOURNEY_DEPTH": JOURNEY_DEPTH,
                  **__get_constraint_values(args), **extra_values}

        rows = ch.execute(query=ch_query, params=params)
        # print(ch_query % params)
    return __transform_journey(rows)


def __compute_weekly_percentage(rows):
    if rows is None or len(rows) == 0:
        return rows
    t = -1
    for r in rows:
        if r["week"] == 0:
            t = r["usersCount"]
        r["percentage"] = r["usersCount"] / t
    return rows


def __complete_retention(rows, start_date, end_date=None):
    if rows is None:
        return []
    max_week = 10
    for i in range(max_week):
        if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
            break
        neutral = {
            "firstConnexionWeek": start_date,
            "week": i,
            "usersCount": 0,
            "connectedUsers": [],
            "percentage": 0
        }
        if i < len(rows) \
                and i != rows[i]["week"]:
            rows.insert(i, neutral)
        elif i >= len(rows):
            rows.append(neutral)
    return rows


def __complete_acquisition(rows, start_date, end_date=None):
    if rows is None:
        return []
    max_week = 10
    week = 0
    delta_date = 0
    while max_week > 0:
        start_date += TimeUTC.MS_WEEK
        if end_date is not None and start_date >= end_date:
            break
        delta = 0
        if delta_date + week >= len(rows) \
                or delta_date + week < len(rows) and rows[delta_date + week]["firstConnexionWeek"] > start_date:
            for i in range(max_week):
                if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
                    break

                neutral = {
                    "firstConnexionWeek": start_date,
                    "week": i,
                    "usersCount": 0,
                    "connectedUsers": [],
                    "percentage": 0
                }
                rows.insert(delta_date + week + i, neutral)
                delta = i
        else:
            for i in range(max_week):
                if end_date is not None and start_date + i * TimeUTC.MS_WEEK >= end_date:
                    break

                neutral = {
                    "firstConnexionWeek": start_date,
                    "week": i,
                    "usersCount": 0,
                    "connectedUsers": [],
                    "percentage": 0
                }
                if delta_date + week + i < len(rows) \
                        and i != rows[delta_date + week + i]["week"]:
                    rows.insert(delta_date + week + i, neutral)
                elif delta_date + week + i >= len(rows):
                    rows.append(neutral)
                delta = i
        week += delta
        max_week -= 1
        delta_date += 1
    return rows


def users_retention(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
                    **args):
    startTimestamp = TimeUTC.trunc_week(startTimestamp)
    endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
    ch_sub_query = __get_basic_constraints(table_name='sessions_metadata', data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
    ch_sub_query.append("not empty(sessions_metadata.user_id)")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toInt8((connexion_week - toDate(%(startTimestamp)s / 1000)) / 7) AS week,
                               COUNT(all_connexions.user_id)             AS users_count,
                               groupArray(100)(all_connexions.user_id)            AS connected_users
                        FROM (SELECT DISTINCT user_id
                              FROM sessions_metadata
                              WHERE {" AND ".join(ch_sub_query)}
                                AND toStartOfWeek(sessions_metadata.datetime,1) = toDate(%(startTimestamp)s / 1000)
                                AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                AND isNull((SELECT 1
                                            FROM sessions_metadata AS bmsess
                                            WHERE bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                              AND bmsess.project_id = %(project_id)s
                                              AND bmsess.user_id = sessions_metadata.user_id
                                            LIMIT 1))
                                 ) AS users_list
                                 INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime,1) AS connexion_week
                                             FROM sessions_metadata
                                             WHERE {" AND ".join(ch_sub_query)}
                            ) AS all_connexions USING (user_id)
                        GROUP BY connexion_week
                        ORDER BY connexion_week;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        # print(ch_query % params)
        rows = ch.execute(ch_query, params)
        rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
    return {
        "startTimestamp": startTimestamp,
        "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
    }


def users_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                      filters=[], **args):
    startTimestamp = TimeUTC.trunc_week(startTimestamp)
    endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
    ch_sub_query = __get_basic_constraints(table_name='sessions_metadata', data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
    ch_sub_query.append("not empty(sessions_metadata.user_id)")
    ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s / 1000)")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toDateTime(first_connexion_week))*1000 AS first_connexion_week,
                           week,
                           users_count,
                           connected_users
                    FROM (
                            SELECT first_connexion_week,
                                   toInt8((connexion_week - first_connexion_week) / 7) AS week,
                                   COUNT(DISTINCT all_connexions.user_id)              AS users_count,
                                   groupArray(20)(all_connexions.user_id)             AS connected_users
                            FROM (SELECT user_id, MIN(toStartOfWeek(sessions_metadata.datetime, 1)) AS first_connexion_week
                                  FROM sessions_metadata
                                  WHERE {" AND ".join(ch_sub_query)}
                                    AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                    AND isNull((SELECT 1
                                                FROM sessions_metadata AS bmsess
                                                WHERE bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                                  AND bmsess.project_id = %(project_id)s
                                                  AND bmsess.user_id = sessions_metadata.user_id
                                                LIMIT 1))
                                  GROUP BY user_id) AS users_list
                                     INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime, 1) AS connexion_week
                                                 FROM sessions_metadata
                                                 WHERE {" AND ".join(ch_sub_query)}
                                                 ORDER BY connexion_week, user_id
                                ) AS all_connexions USING (user_id)
                            WHERE first_connexion_week <= connexion_week
                            GROUP BY first_connexion_week, week
                            ORDER BY first_connexion_week, week
                    ) AS full_data;"""

        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        # print(ch_query % params)
        rows = ch.execute(ch_query, params)
        rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
    return {
        "startTimestamp": startTimestamp,
        "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
    }


def feature_retention(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                      filters=[], **args):
    startTimestamp = TimeUTC.trunc_week(startTimestamp)
    endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
    ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
    meta_condition = __get_meta_constraint(args)
    event_type = "PAGES"
    event_value = "/"
    extra_values = {}
    default = True
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]

    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                            FROM {event_table} AS feature
                                {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY value
                            ORDER BY count DESC
                            LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            # print(ch_query% params)
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            else:
                print(f"no {event_table} most used value")
                return {
                    "startTimestamp": startTimestamp,
                    "filters": [{"type": "EVENT_TYPE", "value": event_type},
                                {"type": "EVENT_VALUE", "value": ""}],
                    "chart": __complete_retention(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
                }
        extra_values["value"] = event_value
        if len(meta_condition) == 0:
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
        ch_sub_query += meta_condition
        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT toInt8((connexion_week - toDate(%(startTimestamp)s / 1000)) / 7) AS week,
                               COUNT(DISTINCT all_connexions.user_id)             AS users_count,
                               groupArray(100)(all_connexions.user_id)            AS connected_users
                        FROM (SELECT DISTINCT user_id
                              FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                              WHERE {" AND ".join(ch_sub_query)}
                                AND toStartOfWeek(feature.datetime,1) = toDate(%(startTimestamp)s / 1000)
                                AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                AND feature.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                AND isNull((SELECT 1
                                            FROM {event_table} AS bsess INNER JOIN sessions_metadata AS bmsess USING (session_id)
                                            WHERE bsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                              AND bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                              AND bsess.project_id = %(project_id)s
                                              AND bmsess.project_id = %(project_id)s
                                              AND bmsess.user_id = sessions_metadata.user_id
                                              AND bsess.{event_column}=%(value)s
                                            LIMIT 1))
                                 ) AS users_list
                                 INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime,1) AS connexion_week
                                             FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                                             WHERE {" AND ".join(ch_sub_query)}
                                             ORDER BY connexion_week, user_id
                            ) AS all_connexions USING (user_id)
                        GROUP BY connexion_week
                        ORDER BY connexion_week;"""

        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        print(ch_query % params)
        rows = ch.execute(ch_query, params)
        rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
    return {
        "startTimestamp": startTimestamp,
        "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
        "chart": __complete_retention(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
    }


def feature_acquisition(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                        filters=[], **args):
    startTimestamp = TimeUTC.trunc_week(startTimestamp)
    endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
    ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
    meta_condition = __get_meta_constraint(args)

    event_type = "PAGES"
    event_value = "/"
    extra_values = {}
    default = True
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")

            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]
    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                            FROM {event_table} AS feature 
                                    {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY value
                            ORDER BY count DESC
                            LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            # print(ch_query% params)
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            else:
                print(f"no {event_table} most used value")
                return {
                    "startTimestamp": startTimestamp,
                    "filters": [{"type": "EVENT_TYPE", "value": event_type},
                                {"type": "EVENT_VALUE", "value": ""}],
                    "chart": __complete_acquisition(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
                }
        extra_values["value"] = event_value

        if len(meta_condition) == 0:
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")

        ch_sub_query += meta_condition
        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT toUnixTimestamp(toDateTime(first_connexion_week))*1000 AS first_connexion_week,
                               week,
                               users_count,
                               connected_users
                        FROM (
                                SELECT first_connexion_week,
                                       toInt8((connexion_week - first_connexion_week) / 7) AS week,
                                       COUNT(DISTINCT all_connexions.user_id)              AS users_count,
                                       groupArray(100)(all_connexions.user_id)             AS connected_users
                                FROM (SELECT user_id, MIN(toStartOfWeek(feature.datetime, 1)) AS first_connexion_week
                                      FROM sessions_metadata INNER JOIN {event_table} AS feature USING (session_id)
                                      WHERE {" AND ".join(ch_sub_query)}
                                        AND sessions_metadata.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                        AND feature.datetime < toDateTime(%(startTimestamp)s/1000 + 8 * 24 * 60 * 60 )
                                        AND isNull((SELECT 1
                                                    FROM sessions_metadata AS bmsess 
                                                        INNER JOIN {event_table} AS bsess USING (session_id)
                                                    WHERE bsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                                      AND bmsess.datetime < toDateTime(%(startTimestamp)s / 1000)
                                                      AND bsess.project_id = %(project_id)s
                                                      AND bmsess.project_id = %(project_id)s
                                                      AND bmsess.user_id = sessions_metadata.user_id
                                                      AND bsess.{event_column} = %(value)s
                                                    LIMIT 1))
                                      GROUP BY user_id) AS users_list
                                         INNER JOIN (SELECT DISTINCT user_id, toStartOfWeek(datetime, 1) AS connexion_week
                                                     FROM sessions_metadata INNER JOIN {event_table} AS feature USING (session_id)
                                                     WHERE {" AND ".join(ch_sub_query)}
                                                     ORDER BY connexion_week, user_id
                                    ) AS all_connexions USING (user_id)
                                WHERE first_connexion_week <= connexion_week
                                GROUP BY first_connexion_week, week
                                ORDER BY first_connexion_week, week
                        ) AS full_data;"""

        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        print(ch_query % params)
        rows = ch.execute(ch_query, params)
        rows = __compute_weekly_percentage(helper.list_to_camel_case(rows))
    return {
        "startTimestamp": startTimestamp,
        "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
        "chart": __complete_acquisition(rows=rows, start_date=startTimestamp, end_date=TimeUTC.now())
    }


def feature_popularity_frequency(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                                 filters=[], **args):
    startTimestamp = TimeUTC.trunc_week(startTimestamp)
    endTimestamp = startTimestamp + 10 * TimeUTC.MS_WEEK
    ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
    meta_condition = __get_meta_constraint(args)

    event_table = JOURNEY_TYPES["CLICK"]["table"]
    event_column = JOURNEY_TYPES["CLICK"]["column"]
    extra_values = {}
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_table = JOURNEY_TYPES[f["value"]]["table"]
            event_column = JOURNEY_TYPES[f["value"]]["column"]
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]

    with ch_client.ClickHouseClient() as ch:
        if len(meta_condition) == 0:
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
        ch_sub_query += meta_condition
        ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
                        FROM sessions_metadata
                        WHERE {" AND ".join(meta_condition)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        # print("---------------------")
        all_user_count = ch.execute(ch_query, params)
        if len(all_user_count) == 0 or all_user_count[0]["count"] == 0:
            return []
        all_user_count = all_user_count[0]["count"]
        ch_query = f"""SELECT {event_column} AS value, COUNT(DISTINCT user_id) AS count
                    FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                    WHERE {" AND ".join(ch_sub_query)}
                        AND length({event_column})>2
                    GROUP BY value
                    ORDER BY count DESC
                    LIMIT 7;"""

        # print(ch_query % params)
        # print("---------------------")
        popularity = ch.execute(ch_query, params)
        params["values"] = [p["value"] for p in popularity]
        if len(params["values"]) == 0:
            return []
        ch_query = f"""SELECT {event_column} AS value, COUNT(session_id) AS count
                        FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                        WHERE {" AND ".join(ch_sub_query)}
                            AND {event_column} IN %(values)s
                        GROUP BY value;"""

        # print(ch_query % params)
        # print("---------------------")
        frequencies = ch.execute(ch_query, params)
        total_usage = sum([f["count"] for f in frequencies])
        frequencies = {f["value"]: f["count"] for f in frequencies}
        for p in popularity:
            p["popularity"] = p.pop("count") / all_user_count
            p["frequency"] = frequencies[p["value"]] / total_usage

    return popularity


def feature_adoption(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                     filters=[], **args):
    event_type = "CLICK"
    event_value = '/'
    extra_values = {}
    default = True
    meta_condition = []
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]

    ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition
    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                        FROM {event_table} AS feature 
                            {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY value
                        ORDER BY count DESC
                        LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            # print(ch_query % params)
            # print("---------------------")
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            # else:
            #     print(f"no {event_table} most used value")
            #     return {"target": 0, "adoption": 0,
            #             "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": ""}]}

        extra_values["value"] = event_value

        if len(meta_condition) == 0:
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            ch_sub_query += meta_condition
        ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
                                FROM sessions_metadata
                                WHERE {" AND ".join(meta_condition)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        # print("---------------------")
        all_user_count = ch.execute(ch_query, params)
        if len(all_user_count) == 0 or all_user_count[0]["count"] == 0:
            return {"adoption": 0, "target": 0, "filters": [{"type": "EVENT_TYPE", "value": event_type},
                                                            {"type": "EVENT_VALUE", "value": event_value}], }
        all_user_count = all_user_count[0]["count"]

        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT COUNT(DISTINCT user_id) AS count
                    FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                    WHERE {" AND ".join(ch_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        # print("---------------------")
        adoption = ch.execute(ch_query, params)
        adoption = adoption[0]["count"] / all_user_count
    return {"target": all_user_count, "adoption": adoption,
            "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}


def feature_adoption_top_users(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                               filters=[], **args):
    event_type = "CLICK"
    event_value = '/'
    extra_values = {}
    default = True
    meta_condition = []
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("user_id IS NOT NULL")
            meta_condition.append("not empty(sessions_metadata.user_id)")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]
    ch_sub_query = __get_basic_constraints(table_name='feature', data=args)
    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                        FROM {event_table} AS feature 
                            {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY value
                        ORDER BY count DESC
                        LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            else:
                print(f"no {event_table} most used value")
                return {"users": [],
                        "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": ""}]}

        extra_values["value"] = event_value
        if len(meta_condition) == 0:
            ch_sub_query.append("user_id IS NOT NULL")
            ch_sub_query.append("not empty(sessions_metadata.user_id)")
            ch_sub_query.append("sessions_metadata.project_id = %(project_id)s")
            ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            ch_sub_query.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT user_id, COUNT(DISTINCT session_id) AS count
                        FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY user_id
                        ORDER BY count DESC
                        LIMIT 10;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        rows = ch.execute(ch_query, params)
    return {"users": helper.list_to_camel_case(rows),
            "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}


def feature_adoption_daily_usage(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(),
                                 filters=[], **args):
    event_type = "CLICK"
    event_value = '/'
    extra_values = {}
    default = True
    meta_condition = []
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")

            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]
    ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition
    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                            FROM {event_table} AS feature {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                                AND length({event_column}) > 2
                            GROUP BY value
                            ORDER BY count DESC
                            LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            # print(ch_query % params)
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            else:
                print(f"no {event_table} most used value")
                return {
                    "startTimestamp": startTimestamp,
                    "filters": [{"type": "EVENT_TYPE", "value": event_type},
                                {"type": "EVENT_VALUE", "value": ""}],
                    "chart": __complete_acquisition(rows=[], start_date=startTimestamp, end_date=TimeUTC.now())
                }
        extra_values["value"] = event_value
        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT toUnixTimestamp(day)*1000 AS timestamp, count
                        FROM (SELECT toStartOfDay(feature.datetime) AS day, COUNT(DISTINCT session_id) AS count
                              FROM {event_table} AS feature {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY day
                              ORDER BY day) AS raw_results;"""
        params = {"step_size": TimeUTC.MS_DAY, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        rows = ch.execute(ch_query, params)
    return {"chart": __complete_missing_steps(rows=rows, start_time=startTimestamp, end_time=endTimestamp,
                                              density=(endTimestamp - startTimestamp) // TimeUTC.MS_DAY,
                                              neutral={"count": 0}),
            "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}]}


def feature_intensity(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
                      **args):
    event_table = JOURNEY_TYPES["CLICK"]["table"]
    event_column = JOURNEY_TYPES["CLICK"]["column"]
    extra_values = {}
    meta_condition = []
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_table = JOURNEY_TYPES[f["value"]]["table"]
            event_column = JOURNEY_TYPES[f["value"]]["column"]
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]
    ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT {event_column} AS value, AVG(DISTINCT session_id) AS avg
                    FROM {event_table} AS feature
                        {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)}
                    GROUP BY value
                    ORDER BY avg DESC
                    LIMIT 7;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        # print(ch_query % params)
        rows = ch.execute(ch_query, params)

    return rows


PERIOD_TO_FUNCTION = {
    "DAY": "toStartOfDay",
    "WEEK": "toStartOfWeek"
}


def users_active(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
                 **args):
    meta_condition = __get_meta_constraint(args)
    period = "DAY"
    extra_values = {}
    for f in filters:
        if f["type"] == "PERIOD" and f["value"] in ["DAY", "WEEK"]:
            period = f["value"]
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            extra_values["user_id"] = f["value"]
    period_function = PERIOD_TO_FUNCTION[period]
    ch_sub_query = __get_basic_constraints(table_name="sessions_metadata", data=args)
    ch_sub_query += meta_condition
    ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
    ch_sub_query.append("not empty(sessions_metadata.user_id)")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT SUM(count) / intDiv(%(endTimestamp)s - %(startTimestamp)s, %(step_size)s) AS avg
                        FROM (SELECT {period_function}(sessions_metadata.datetime) AS period, count(DISTINCT user_id) AS count
                              FROM sessions_metadata
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY period) AS daily_users;"""
        params = {"step_size": TimeUTC.MS_DAY if period == "DAY" else TimeUTC.MS_WEEK,
                  "project_id": project_id,
                  "startTimestamp": TimeUTC.trunc_day(startTimestamp) if period == "DAY" else TimeUTC.trunc_week(
                      startTimestamp), "endTimestamp": endTimestamp, **__get_constraint_values(args),
                  **extra_values}
        # print(ch_query % params)
        # print("---------------------")
        avg = ch.execute(ch_query, params)
        if len(avg) == 0 or avg[0]["avg"] == 0:
            return {"avg": 0, "chart": []}
        avg = avg[0]["avg"]
        # TODO: optimize this when DB structure changes, optimization from 3s to 1s
        ch_query = f"""SELECT toUnixTimestamp(toDateTime(period))*1000 AS timestamp, count
                        FROM (SELECT {period_function}(sessions_metadata.datetime) AS period, count(DISTINCT user_id) AS count
                              FROM sessions_metadata
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY period
                              ORDER BY period) AS raw_results;"""
        # print(ch_query % params)
        # print("---------------------")
        rows = ch.execute(ch_query, params)
    return {"avg": avg, "chart": rows}


def users_power(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[], **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions_metadata", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
    ch_sub_query.append("not empty(sessions_metadata.user_id)")

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT ifNotFinite(AVG(count),0) AS avg
                        FROM(SELECT COUNT(user_id) AS count
                        FROM (SELECT user_id, COUNT(DISTINCT toStartOfDay(datetime)) AS number_of_days
                              FROM sessions_metadata
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY user_id) AS users_connexions
                        GROUP BY number_of_days
                        ORDER BY number_of_days) AS results;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp, "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        # print(ch_query % params)
        # print("---------------------")
        avg = ch.execute(ch_query, params)
        if len(avg) == 0 or avg[0]["avg"] == 0:
            return {"avg": 0, "partition": []}
        avg = avg[0]["avg"]
        ch_query = f"""SELECT number_of_days, COUNT(user_id) AS count
                        FROM (SELECT user_id, COUNT(DISTINCT toStartOfDay(datetime)) AS number_of_days
                              FROM sessions_metadata
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY user_id) AS users_connexions
                        GROUP BY number_of_days
                        ORDER BY number_of_days;"""

        # print(ch_query % params)
        # print("---------------------")
        rows = ch.execute(ch_query, params)

    return {"avg": avg, "partition": helper.list_to_camel_case(rows)}


def users_slipping(project_id, startTimestamp=TimeUTC.now(delta_days=-70), endTimestamp=TimeUTC.now(), filters=[],
                   **args):
    ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
    event_type = "PAGES"
    event_value = "/"
    extra_values = {}
    default = True
    meta_condition = []
    for f in filters:
        if f["type"] == "EVENT_TYPE" and JOURNEY_TYPES.get(f["value"]):
            event_type = f["value"]
        elif f["type"] == "EVENT_VALUE":
            event_value = f["value"]
            default = False
        elif f["type"] in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
            meta_condition.append(f"sessions_metadata.user_id = %(user_id)s")
            meta_condition.append("sessions_metadata.project_id = %(project_id)s")
            meta_condition.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            meta_condition.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
            extra_values["user_id"] = f["value"]
    event_table = JOURNEY_TYPES[event_type]["table"]
    event_column = JOURNEY_TYPES[event_type]["column"]

    meta_condition += __get_meta_constraint(args)
    ch_sub_query += meta_condition
    with ch_client.ClickHouseClient() as ch:
        if default:
            # get most used value
            ch_query = f"""SELECT {event_column} AS value, COUNT(*) AS count
                            FROM {event_table} AS feature 
                                {"INNER JOIN sessions_metadata USING (session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY value
                            ORDER BY count DESC
                            LIMIT 1;"""
            params = {"project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
            print(ch_query % params)
            row = ch.execute(ch_query, params)
            if len(row) > 0:
                event_value = row[0]["value"]
            else:
                print(f"no {event_table} most used value")
                return {
                    "startTimestamp": startTimestamp,
                    "filters": [{"type": "EVENT_TYPE", "value": event_type},
                                {"type": "EVENT_VALUE", "value": ""}],
                    "list": []
                }
        extra_values["value"] = event_value
        if len(meta_condition) == 0:
            ch_sub_query.append("sessions_metadata.user_id IS NOT NULL")
            ch_sub_query.append("not empty(sessions_metadata.user_id)")
            ch_sub_query.append("sessions_metadata.project_id = %(project_id)s")
            ch_sub_query.append("sessions_metadata.datetime >= toDateTime(%(startTimestamp)s/1000)")
            ch_sub_query.append("sessions_metadata.datetime < toDateTime(%(endTimestamp)s/1000)")
        ch_sub_query.append(f"feature.{event_column} = %(value)s")
        ch_query = f"""SELECT user_id,
                               toUnixTimestamp(last_time)*1000 AS last_time,
                               interactions_count,
                               toUnixTimestamp(first_seen) * 1000 AS first_seen,
                               toUnixTimestamp(last_seen) * 1000  AS last_seen
                        FROM (SELECT user_id, last_time, interactions_count, MIN(datetime) AS first_seen, MAX(datetime) AS last_seen
                              FROM (SELECT user_id, MAX(datetime) AS last_time, COUNT(DISTINCT session_id) AS interactions_count
                                    FROM {event_table} AS feature INNER JOIN sessions_metadata USING (session_id)
                                    WHERE {" AND ".join(ch_sub_query)}
                                    GROUP BY user_id ) AS user_last_usage INNER JOIN sessions_metadata USING (user_id)
                              WHERE now() - last_time > 7
                              GROUP BY user_id, last_time, interactions_count
                              ORDER BY interactions_count DESC, last_time DESC
                              LIMIT 50) AS raw_results;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args), **extra_values}
        print(ch_query % params)
        rows = ch.execute(ch_query, params)
    return {
        "startTimestamp": startTimestamp,
        "filters": [{"type": "EVENT_TYPE", "value": event_type}, {"type": "EVENT_VALUE", "value": event_value}],
        "list": helper.list_to_camel_case(rows)
    }


def search(text, feature_type, project_id, platform=None):
    if not feature_type:
        resource_type = "ALL"
        data = search(text=text, feature_type=resource_type, project_id=project_id, platform=platform)
        return data
    args = {} if platform is None else {"platform": platform}
    ch_sub_query = __get_basic_constraints(table_name="feature", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    params = {"startTimestamp": TimeUTC.now() - 1 * TimeUTC.MS_MONTH,
              "endTimestamp": TimeUTC.now(),
              "project_id": project_id,
              "value": text.lower(),
              "platform_0": platform}
    if feature_type == "ALL":
        with ch_client.ClickHouseClient() as ch:
            sub_queries = []
            for e in JOURNEY_TYPES:
                sub_queries.append(f"""(SELECT DISTINCT {JOURNEY_TYPES[e]["column"]} AS value, '{e}' AS "type"
                             FROM {JOURNEY_TYPES[e]["table"]} AS feature
                             WHERE {" AND ".join(ch_sub_query)} AND positionUTF8({JOURNEY_TYPES[e]["column"]},%(value)s)!=0
                             LIMIT 10)""")
            ch_query = "UNION ALL".join(sub_queries)
            print(ch_query % params)
            rows = ch.execute(ch_query, params)
    elif JOURNEY_TYPES.get(feature_type) is not None:
        with ch_client.ClickHouseClient() as ch:
            ch_query = f"""SELECT DISTINCT {JOURNEY_TYPES[feature_type]["column"]} AS value, '{feature_type}' AS "type"
                             FROM {JOURNEY_TYPES[feature_type]["table"]} AS feature
                             WHERE {" AND ".join(ch_sub_query)} AND positionUTF8({JOURNEY_TYPES[feature_type]["column"]},%(value)s)!=0
                             LIMIT 10;"""
            print(ch_query % params)
            rows = ch.execute(ch_query, params)
    else:
        return []
    return [helper.dict_to_camel_case(row) for row in rows]
