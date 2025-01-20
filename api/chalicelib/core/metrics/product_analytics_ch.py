from typing import List

import schemas
from chalicelib.core.metrics.metrics_ch import __get_basic_constraints, __get_basic_constraints_events
from chalicelib.core.metrics.metrics_ch import __get_constraint_values, __complete_missing_steps
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils import helper, dev
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils import sql_helper as sh
from chalicelib.core import metadata
from time import time

import logging
from chalicelib.core.metrics.product_analytics import __transform_journey

logger = logging.getLogger(__name__)

JOURNEY_TYPES = {
    schemas.ProductAnalyticsSelectedEventType.LOCATION: {
        "eventType": "LOCATION",
        "column": "JSON_VALUE(CAST(`$properties` AS String), '$.url_path')",
    },
    schemas.ProductAnalyticsSelectedEventType.CLICK: {
        "eventType": "LOCATION",
        "column": "JSON_VALUE(CAST(`$properties` AS String), '$.label')",
    },
    schemas.ProductAnalyticsSelectedEventType.INPUT: {
        "eventType": "LOCATION",
        "column": "JSON_VALUE(CAST(`$properties` AS String), '$.label')",
    },
    schemas.ProductAnalyticsSelectedEventType.CUSTOM_EVENT: {
        "eventType": "LOCATION",
        "column": "JSON_VALUE(CAST(`$properties` AS String), '$.name')",
    },
}


# Q6: use events as a sub_query to support filter of materialized columns when doing a join
# query: Q5, the result is correct,
# startPoints are computed before ranked_events to reduce the number of window functions over rows
# replaced time_to_target by time_from_previous
# compute avg_time_from_previous at the same level as sessions_count (this was removed in v1.22)
# sort by top 5 according to sessions_count at the CTE level
# final part project data without grouping
# if start-point is selected, the selected event is ranked n°1
def path_analysis(project_id: int, data: schemas.CardPathAnalysis):
    # This code is used for testing only
    with ch_client.ClickHouseClient(database="experimental") as ch:
        ch_query1 = """
CREATE TEMPORARY TABLE pre_ranked_events_1736344377403 AS
    (WITH initial_event AS (SELECT events.session_id, MIN(datetime) AS start_event_timestamp
                            FROM experimental.events AS events
                            WHERE ((event_type = 'LOCATION' AND (url_path = '/en/deployment/')))
                              AND events.project_id = toUInt16(65)
                              AND events.datetime >= toDateTime(1735599600000 / 1000)
                              AND events.datetime < toDateTime(1736290799999 / 1000)
                            GROUP BY 1),
          pre_ranked_events AS (SELECT *
                                FROM (SELECT session_id,
                                             event_type,
                                             datetime,
                                             url_path             AS e_value,
                                             row_number() OVER (PARTITION BY session_id
                                                 ORDER BY datetime ,
                                                     message_id ) AS event_number_in_session
                                      FROM experimental.events AS events
                                               INNER JOIN initial_event ON (events.session_id = initial_event.session_id)
                                      WHERE events.project_id = toUInt16(65)
                                        AND events.datetime >= toDateTime(1735599600000 / 1000)
                                        AND events.datetime < toDateTime(1736290799999 / 1000)
                                        AND (events.event_type = 'LOCATION')
                                        AND events.datetime >= initial_event.start_event_timestamp
                                         ) AS full_ranked_events
                                WHERE event_number_in_session <= 5)
     SELECT *
     FROM pre_ranked_events);
        """
        ch.execute(query=ch_query1, parameters={})
        ch_query1 = """
        CREATE TEMPORARY TABLE ranked_events_1736344377403 AS
    (WITH pre_ranked_events AS (SELECT *
                                FROM pre_ranked_events_1736344377403),
          start_points AS (SELECT DISTINCT session_id
                           FROM pre_ranked_events
                           WHERE ((event_type = 'LOCATION' AND (e_value = '/en/deployment/')))
                             AND pre_ranked_events.event_number_in_session = 1),
          ranked_events AS (SELECT pre_ranked_events.*,
                                   leadInFrame(e_value)
                                               OVER (PARTITION BY session_id ORDER BY datetime
                                                   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_value,
                                   leadInFrame(toNullable(event_type))
                                               OVER (PARTITION BY session_id ORDER BY datetime
                                                   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_type
                            FROM start_points
                                     INNER JOIN pre_ranked_events USING (session_id))
     SELECT *
     FROM ranked_events);
        """
        ch.execute(query=ch_query1, parameters={})
        ch_query1 = """
        WITH ranked_events AS (SELECT *
                       FROM ranked_events_1736344377403),
     n1 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 1
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n2 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 2
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n3 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 3
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),

     drop_n AS (-- STEP 1
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n1
         WHERE isNull(n1.next_type)
         UNION ALL
         -- STEP 2
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n2
         WHERE isNull(n2.next_type)),
     top_n AS (SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n1
               GROUP BY event_number_in_session, event_type, e_value
               LIMIT 1
               UNION ALL
               -- STEP 2
               SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n2
               GROUP BY event_number_in_session, event_type, e_value
               ORDER BY sessions_count DESC
               LIMIT 3
               UNION ALL
               -- STEP 3
               SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n3
               GROUP BY event_number_in_session, event_type, e_value
               ORDER BY sessions_count DESC
               LIMIT 3),
     top_n_with_next AS (SELECT n1.*
                         FROM n1
                         UNION ALL
                         SELECT n2.*
                         FROM n2
                                  INNER JOIN top_n ON (n2.event_number_in_session = top_n.event_number_in_session
                             AND n2.event_type = top_n.event_type
                             AND n2.e_value = top_n.e_value)),
     others_n AS (
         -- STEP 2
         SELECT n2.*
         FROM n2
         WHERE (n2.event_number_in_session, n2.event_type, n2.e_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value
                FROM top_n
                WHERE top_n.event_number_in_session = 2)
         UNION ALL
         -- STEP 3
         SELECT n3.*
         FROM n3
         WHERE (n3.event_number_in_session, n3.event_type, n3.e_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value
                FROM top_n
                WHERE top_n.event_number_in_session = 3))
SELECT *
FROM (
-- Top to Top: valid
         SELECT top_n_with_next.*
         FROM top_n_with_next
                  INNER JOIN top_n
                             ON (top_n_with_next.event_number_in_session + 1 = top_n.event_number_in_session
                                 AND top_n_with_next.next_type = top_n.event_type
                                 AND top_n_with_next.next_value = top_n.e_value)
         UNION ALL
-- Top to Others: valid
         SELECT top_n_with_next.event_number_in_session,
                top_n_with_next.event_type,
                top_n_with_next.e_value,
                'OTHER'                             AS next_type,
                NULL                                AS next_value,
                SUM(top_n_with_next.sessions_count) AS sessions_count
         FROM top_n_with_next
         WHERE (top_n_with_next.event_number_in_session + 1, top_n_with_next.next_type, top_n_with_next.next_value) IN
               (SELECT others_n.event_number_in_session, others_n.event_type, others_n.e_value FROM others_n)
         GROUP BY top_n_with_next.event_number_in_session, top_n_with_next.event_type, top_n_with_next.e_value
         UNION ALL
-- Top go to Drop: valid
         SELECT drop_n.event_number_in_session,
                drop_n.event_type,
                drop_n.e_value,
                drop_n.next_type,
                drop_n.next_value,
                drop_n.sessions_count
         FROM drop_n
                  INNER JOIN top_n ON (drop_n.event_number_in_session = top_n.event_number_in_session
             AND drop_n.event_type = top_n.event_type
             AND drop_n.e_value = top_n.e_value)
         ORDER BY drop_n.event_number_in_session
         UNION ALL
-- Others got to Drop: valid
         SELECT others_n.event_number_in_session,
                'OTHER'                      AS event_type,
                NULL                         AS e_value,
                'DROP'                       AS next_type,
                NULL                         AS next_value,
                SUM(others_n.sessions_count) AS sessions_count
         FROM others_n
         WHERE isNull(others_n.next_type)
           AND others_n.event_number_in_session < 3
         GROUP BY others_n.event_number_in_session, next_type, next_value
         UNION ALL
-- Others got to Top:valid
         SELECT others_n.event_number_in_session,
                'OTHER'                      AS event_type,
                NULL                         AS e_value,
                others_n.next_type,
                others_n.next_value,
                SUM(others_n.sessions_count) AS sessions_count
         FROM others_n
         WHERE isNotNull(others_n.next_type)
           AND (others_n.event_number_in_session + 1, others_n.next_type, others_n.next_value) IN
               (SELECT top_n.event_number_in_session, top_n.event_type, top_n.e_value FROM top_n)
         GROUP BY others_n.event_number_in_session, others_n.next_type, others_n.next_value
         UNION ALL
-- Others got to Others
         SELECT others_n.event_number_in_session,
                'OTHER'             AS event_type,
                NULL                AS e_value,
                'OTHER'            AS next_type,
                NULL                AS next_value,
                SUM(sessions_count) AS sessions_count
         FROM others_n
         WHERE isNotNull(others_n.next_type)
           AND others_n.event_number_in_session < 3
           AND (others_n.event_number_in_session + 1, others_n.next_type, others_n.next_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value FROM top_n)
         GROUP BY others_n.event_number_in_session)
ORDER BY event_number_in_session, sessions_count DESC;"""
    rows = ch.execute(query=ch_query1, parameters={})
    drop = 0
    for r in rows:
        if r["next_type"] == "DROP":
            drop += r["sessions_count"]
            r["sessions_count"] = drop

    return __transform_journey(rows=rows, reverse_path=False)

    # ------ end of testing code ---
    sub_events = []
    start_points_conditions = []
    step_0_conditions = []
    step_1_post_conditions = ["event_number_in_session <= %(density)s"]

    if len(data.metric_value) == 0:
        data.metric_value.append(schemas.ProductAnalyticsSelectedEventType.LOCATION)
        sub_events.append({"column": JOURNEY_TYPES[schemas.ProductAnalyticsSelectedEventType.LOCATION]["column"],
                           "eventType": schemas.ProductAnalyticsSelectedEventType.LOCATION.value})
    else:
        if len(data.start_point) > 0:
            extra_metric_values = []
            for s in data.start_point:
                if s.type not in data.metric_value:
                    sub_events.append({"column": JOURNEY_TYPES[s.type]["column"],
                                       "eventType": JOURNEY_TYPES[s.type]["eventType"]})
                    step_1_post_conditions.append(
                        f"(`$event_name`!='{JOURNEY_TYPES[s.type]["eventType"]}' OR event_number_in_session = 1)")
                    extra_metric_values.append(s.type)
            data.metric_value += extra_metric_values

        for v in data.metric_value:
            if JOURNEY_TYPES.get(v):
                sub_events.append({"column": JOURNEY_TYPES[v]["column"],
                                   "eventType": JOURNEY_TYPES[v]["eventType"]})

    if len(sub_events) == 1:
        main_column = sub_events[0]['column']
    else:
        main_column = f"multiIf(%s,%s)" % (
            ','.join([f"`$event_name`='{s['eventType']}',{s['column']}" for s in sub_events[:-1]]),
            sub_events[-1]["column"])
    extra_values = {}
    reverse = data.start_type == "end"
    for i, sf in enumerate(data.start_point):
        f_k = f"start_point_{i}"
        op = sh.get_sql_operator(sf.operator)
        sf.value = helper.values_for_operator(value=sf.value, op=sf.operator)
        is_not = sh.is_negation_operator(sf.operator)
        event_column = JOURNEY_TYPES[sf.type]['column']
        event_type = JOURNEY_TYPES[sf.type]['eventType']
        extra_values = {**extra_values, **sh.multi_values(sf.value, value_key=f_k),
                        f"start_event_type_{i}": event_type}
        start_points_conditions.append(f"(`$event_name`=%(start_event_type_{i})s AND " +
                                       sh.multi_conditions(f'{event_column} {op} %({f_k})s', sf.value, is_not=is_not,
                                                           value_key=f_k)
                                       + ")")
        step_0_conditions.append(f"(`$event_name`=%(start_event_type_{i})s AND " +
                                 sh.multi_conditions(f'e_value {op} %({f_k})s', sf.value, is_not=is_not,
                                                     value_key=f_k)
                                 + ")")
    if len(start_points_conditions) > 0:
        start_points_conditions = ["(" + " OR ".join(start_points_conditions) + ")",
                                   "events.project_id = toUInt16(%(project_id)s)",
                                   "events.created_at >= toDateTime(%(startTimestamp)s / 1000)",
                                   "events.created_at < toDateTime(%(endTimestamp)s / 1000)"]
        step_0_conditions = ["(" + " OR ".join(step_0_conditions) + ")",
                             "pre_ranked_events.event_number_in_session = 1"]

    exclusions = {}
    for i, ef in enumerate(data.excludes):
        if len(ef.value) == 0:
            continue
        if ef.type in data.metric_value:
            f_k = f"exclude_{i}"
            ef.value = helper.values_for_operator(value=ef.value, op=ef.operator)
            op = sh.get_sql_operator(ef.operator)
            op = sh.reverse_sql_operator(op)
            extra_values = {**extra_values, **sh.multi_values(ef.value, value_key=f_k)}
            exclusions[ef.type] = [
                sh.multi_conditions(f'{JOURNEY_TYPES[ef.type]["column"]} {op} %({f_k})s', ef.value, is_not=True,
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

        if not is_any and len(f.value) == 0:
            continue

        process_filter(f, is_any, is_not, is_undefined, op, f_k, sessions_conditions, extra_values, meta_keys,
                       project_id)

    if reverse:
        path_direction = "DESC"
    else:
        path_direction = ""

    ch_sub_query = __get_basic_constraints_events(table_name="events")
    selected_event_type_sub_query = []
    for s in data.metric_value:
        selected_event_type_sub_query.append(f"events.`$event_name` = '{JOURNEY_TYPES[s]['eventType']}'")
        if s in exclusions:
            selected_event_type_sub_query[-1] += " AND (" + " AND ".join(exclusions[s]) + ")"
    selected_event_type_sub_query = " OR ".join(selected_event_type_sub_query)
    ch_sub_query.append(f"({selected_event_type_sub_query})")

    main_events_table = exp_ch_helper.get_main_events_table(data.startTimestamp) + " AS events"
    main_sessions_table = exp_ch_helper.get_main_sessions_table(data.startTimestamp) + " AS sessions"
    if len(sessions_conditions) > 0:
        sessions_conditions.append(f"sessions.project_id = toUInt16(%(project_id)s)")
        sessions_conditions.append(f"sessions.datetime >= toDateTime(%(startTimestamp)s / 1000)")
        sessions_conditions.append(f"sessions.datetime < toDateTime(%(endTimestamp)s / 1000)")
        sessions_conditions.append("sessions.events_count>1")
        sessions_conditions.append("sessions.duration>0")

        initial_sessions_cte = f"""sub_sessions AS (SELECT DISTINCT session_id
                        FROM {main_sessions_table}
                        WHERE {" AND ".join(sessions_conditions)}),"""
    else:
        initial_sessions_cte = ""

    if len(start_points_conditions) == 0:
        step_0_subquery = """SELECT DISTINCT session_id
                                   FROM (SELECT `$event_name`, e_value
                                         FROM pre_ranked_events
                                         WHERE event_number_in_session = 1
                                         GROUP BY `$event_name`, e_value
                                         ORDER BY count(1) DESC
                                         LIMIT 1) AS top_start_events
                                            INNER JOIN pre_ranked_events
                                                       ON (top_start_events.`$event_name` = pre_ranked_events.`$event_name` AND
                                                           top_start_events.e_value = pre_ranked_events.e_value)
                                   WHERE pre_ranked_events.event_number_in_session = 1"""
        initial_event_cte = ""
    else:
        step_0_subquery = f"""SELECT DISTINCT session_id
                                    FROM pre_ranked_events
                                    WHERE {" AND ".join(step_0_conditions)}"""
        initial_event_cte = f"""\
            initial_event AS (SELECT events.session_id, MIN(created_at) AS start_event_timestamp
                       FROM {main_events_table} {"INNER JOIN sub_sessions USING (session_id)" if len(sessions_conditions) > 0 else ""}
                       WHERE {" AND ".join(start_points_conditions)}
                       GROUP BY 1),"""
        ch_sub_query.append("events.created_at>=initial_event.start_event_timestamp")
        main_events_table += " INNER JOIN initial_event ON (events.session_id = initial_event.session_id)"
        sessions_conditions = []

    steps_query = ["""n1 AS (SELECT event_number_in_session,
                                    `$event_name` as event_type,
                                    e_value,
                                    next_type,
                                    next_value,
                                    COUNT(1) AS sessions_count
                             FROM ranked_events
                             WHERE event_number_in_session = 1
                               AND isNotNull(next_value)
                             GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
                             ORDER BY sessions_count DESC
                             LIMIT %(eventThresholdNumberInGroup)s)"""]
    projection_query = ["""SELECT event_number_in_session,
                                  event_type,
                                  e_value,
                                  next_type,
                                  next_value,
                                  sessions_count
                           FROM n1"""]
    for i in range(2, data.density + 1):
        steps_query.append(f"""n{i} AS (SELECT *
                                        FROM (SELECT re.event_number_in_session AS event_number_in_session,
                                                     re.`$event_name` as $event_name,
                                                     re.e_value AS e_value,
                                                     re.next_type AS next_type,
                                                     re.next_value AS next_value,
                                                     COUNT(1) AS sessions_count
                                              FROM n{i - 1} INNER JOIN ranked_events AS re
                                                    ON (n{i - 1}.next_value = re.e_value AND n{i - 1}.next_type = re.`$event_name`)
                                              WHERE re.event_number_in_session = {i}
                                              GROUP BY re.event_number_in_session, re.`$event_name`, re.e_value, re.next_type, re.next_value) AS sub_level
                                        ORDER BY sessions_count DESC
                                        LIMIT %(eventThresholdNumberInGroup)s)""")
        projection_query.append(f"""SELECT event_number_in_session,
                                           `$event_name`,
                                           e_value,
                                           next_type,
                                           next_value,
                                           sessions_count
                                    FROM n{i}""")

    with ch_client.ClickHouseClient(database="product_analytics") as ch:
        time_key = TimeUTC.now()
        _now = time()
        params = {"project_id": project_id, "startTimestamp": data.startTimestamp,
                  "endTimestamp": data.endTimestamp, "density": data.density,
                  # This is ignored because UI will take care of it
                  # "eventThresholdNumberInGroup": 4 if data.hide_excess else 8,
                  "eventThresholdNumberInGroup": 8,
                  **extra_values}

        ch_query1 = f"""\
CREATE TEMPORARY TABLE pre_ranked_events_{time_key} AS
WITH {initial_sessions_cte}
     {initial_event_cte}
     pre_ranked_events AS (SELECT *
                           FROM (SELECT session_id,
                                        `$event_name`,
                                        created_at,
                                        {main_column} AS e_value,
                                        row_number() OVER (PARTITION BY session_id 
                                                           ORDER BY created_at {path_direction},
                                                                    event_id {path_direction} ) AS event_number_in_session
                                 FROM {main_events_table} {"INNER JOIN sub_sessions ON (sub_sessions.session_id = events.session_id)" if len(sessions_conditions) > 0 else ""}
                                 WHERE {" AND ".join(ch_sub_query)}
                                 ) AS full_ranked_events
                           WHERE {" AND ".join(step_1_post_conditions)})
SELECT *
FROM pre_ranked_events;"""
        logger.debug("---------Q1-----------")
        query = ch.format(query=ch_query1, parameters=params)
        ch.execute(query=query)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(query)
            logger.warning("----------------------")
        _now = time()

        ch_query2 = f"""\
CREATE TEMPORARY TABLE ranked_events_{time_key} AS
WITH pre_ranked_events AS (SELECT *
                       FROM pre_ranked_events_{time_key}),
     start_points AS ({step_0_subquery}),
     ranked_events AS (SELECT pre_ranked_events.*,
                              leadInFrame(e_value)
                                          OVER (PARTITION BY session_id ORDER BY created_at {path_direction}
                                            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_value,
                              leadInFrame(toNullable(`$event_name`))
                                          OVER (PARTITION BY session_id ORDER BY created_at {path_direction}
                                            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_type
                       FROM start_points INNER JOIN pre_ranked_events USING (session_id))
SELECT *
FROM ranked_events;"""
        logger.debug("---------Q2-----------")
        query = ch.format(query=ch_query2, parameters=params)
        ch.execute(query=query)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(query)
            logger.warning("----------------------")
        _now = time()

        ch_query3 = f"""\
WITH ranked_events AS (SELECT *
                       FROM ranked_events_{time_key}),
    {",".join(steps_query)}
SELECT *
FROM ({" UNION ALL ".join(projection_query)}) AS chart_steps
ORDER BY event_number_in_session;"""
        logger.debug("---------Q3-----------")
        query = ch.format(query=ch_query3, parameters=params)
        rows = ch.execute(query=query)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(query)
            logger.warning("----------------------")

    return __transform_journey(rows=rows, reverse_path=reverse)


def process_filter(f, is_any, is_not, is_undefined, op, f_k, sessions_conditions, extra_values, meta_keys, project_id):
    # Mapping for common types to their column names
    type_column_mapping = {
        schemas.FilterType.USER_BROWSER: 'user_browser',
        schemas.FilterType.USER_OS: 'user_os',
        schemas.FilterType.USER_DEVICE: 'user_device',
        schemas.FilterType.USER_COUNTRY: 'user_country',
        schemas.FilterType.USER_CITY: 'user_city',
        schemas.FilterType.USER_STATE: 'user_state',
        schemas.FilterType.UTM_SOURCE: 'utm_source',
        schemas.FilterType.UTM_MEDIUM: 'utm_medium',
        schemas.FilterType.UTM_CAMPAIGN: 'utm_campaign',
        schemas.FilterType.USER_ID: 'user_id',
        schemas.FilterType.USER_ID_MOBILE: 'user_id',
        schemas.FilterType.USER_ANONYMOUS_ID: 'user_anonymous_id',
        schemas.FilterType.USER_ANONYMOUS_ID_MOBILE: 'user_anonymous_id',
        schemas.FilterType.REV_ID: 'rev_id',
        schemas.FilterType.REV_ID_MOBILE: 'rev_id',
    }

    if f.type in type_column_mapping:
        column = type_column_mapping[f.type]
        if is_any:
            sessions_conditions.append(f'isNotNull({column})')
        elif is_undefined:
            sessions_conditions.append(f'isNull({column})')
        else:
            sessions_conditions.append(
                sh.multi_conditions(f"{column} {op} toString(%({f_k})s)", f.value, is_not=is_not, value_key=f_k)
            )

    elif f.type == schemas.FilterType.DURATION:
        if len(f.value) > 0 and f.value[0] is not None:
            sessions_conditions.append("duration >= %(minDuration)s")
            extra_values["minDuration"] = f.value[0]
        if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
            sessions_conditions.append("duration <= %(maxDuration)s")
            extra_values["maxDuration"] = f.value[1]

    elif f.type == schemas.FilterType.REFERRER:
        if is_any:
            sessions_conditions.append('isNotNull(base_referrer)')
        else:
            sessions_conditions.append(
                sh.multi_conditions(f"base_referrer {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k)
            )

    elif f.type == schemas.FilterType.METADATA:
        if meta_keys is None:
            meta_keys = metadata.get(project_id=project_id)
            meta_keys = {m["key"]: m["index"] for m in meta_keys}
        if f.source in meta_keys.keys():
            column = metadata.index_to_colname(meta_keys[f.source])
            if is_any:
                sessions_conditions.append(f"isNotNull({column})")
            elif is_undefined:
                sessions_conditions.append(f"isNull({column})")
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"{column} {op} toString(%({f_k})s)", f.value, is_not=is_not, value_key=f_k)
                )

    elif f.type == schemas.FilterType.PLATFORM:
        sessions_conditions.append(
            sh.multi_conditions(f"user_device_type {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k)
        )

    elif f.type == schemas.FilterType.ISSUE:
        if is_any:
            sessions_conditions.append("array_length(issue_types, 1) > 0")
        else:
            sessions_conditions.append(
                sh.multi_conditions(f"has(issue_types,%({f_k})s)", f.value, is_not=is_not, value_key=f_k)
            )

    elif f.type == schemas.FilterType.EVENTS_COUNT:
        sessions_conditions.append(
            sh.multi_conditions(f"events_count {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k)
        )
