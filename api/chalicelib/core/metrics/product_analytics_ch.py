from typing import List

import schemas
from chalicelib.core.metrics.metrics_ch import __get_basic_constraints, __get_meta_constraint
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
    schemas.ProductAnalyticsSelectedEventType.LOCATION: {"eventType": "LOCATION", "column": "url_path"},
    schemas.ProductAnalyticsSelectedEventType.CLICK: {"eventType": "CLICK", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.INPUT: {"eventType": "INPUT", "column": "label"},
    schemas.ProductAnalyticsSelectedEventType.CUSTOM_EVENT: {"eventType": "CUSTOM", "column": "name"}
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
                        f"(event_type!='{JOURNEY_TYPES[s.type]["eventType"]}' OR event_number_in_session = 1)")
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
            ','.join([f"event_type='{s['eventType']}',{s['column']}" for s in sub_events[:-1]]),
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
        start_points_conditions.append(f"(event_type=%(start_event_type_{i})s AND " +
                                       sh.multi_conditions(f'{event_column} {op} %({f_k})s', sf.value, is_not=is_not,
                                                           value_key=f_k)
                                       + ")")
        step_0_conditions.append(f"(event_type=%(start_event_type_{i})s AND " +
                                 sh.multi_conditions(f'e_value {op} %({f_k})s', sf.value, is_not=is_not,
                                                     value_key=f_k)
                                 + ")")
    if len(start_points_conditions) > 0:
        start_points_conditions = ["(" + " OR ".join(start_points_conditions) + ")",
                                   "events.project_id = toUInt16(%(project_id)s)",
                                   "events.datetime >= toDateTime(%(startTimestamp)s / 1000)",
                                   "events.datetime < toDateTime(%(endTimestamp)s / 1000)"]
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

        # ---- meta-filters
        if f.type == schemas.FilterType.USER_BROWSER:
            if is_any:
                sessions_conditions.append('isNotNull(user_browser)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.USER_OS]:
            if is_any:
                sessions_conditions.append('isNotNull(user_os)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.USER_DEVICE]:
            if is_any:
                sessions_conditions.append('isNotNull(user_device)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.USER_COUNTRY]:
            if is_any:
                sessions_conditions.append('isNotNull(user_country)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.USER_CITY:
            if is_any:
                sessions_conditions.append('isNotNull(user_city)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.USER_STATE:
            if is_any:
                sessions_conditions.append('isNotNull(user_state)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.UTM_SOURCE]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_source)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_source)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.UTM_MEDIUM]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_medium)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_medium)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.UTM_CAMPAIGN]:
            if is_any:
                sessions_conditions.append('isNotNull(utm_campaign)')
            elif is_undefined:
                sessions_conditions.append('isNull(utm_campaign)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f'utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type == schemas.FilterType.DURATION:
            if len(f.value) > 0 and f.value[0] is not None:
                sessions_conditions.append("duration >= %(minDuration)s")
                extra_values["minDuration"] = f.value[0]
            if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                sessions_conditions.append("duration <= %(maxDuration)s")
                extra_values["maxDuration"] = f.value[1]
        elif f.type == schemas.FilterType.REFERRER:
            # extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
            if is_any:
                sessions_conditions.append('isNotNull(base_referrer)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"base_referrer {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
        elif f.type == schemas.FilterType.METADATA:
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
                            f"{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                            f.value, is_not=is_not, value_key=f_k))

        elif f.type in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE]:
            if is_any:
                sessions_conditions.append('isNotNull(user_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(user_id)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.USER_ANONYMOUS_ID,
                        schemas.FilterType.USER_ANONYMOUS_ID_MOBILE]:
            if is_any:
                sessions_conditions.append('isNotNull(user_anonymous_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(user_anonymous_id)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE]:
            if is_any:
                sessions_conditions.append('isNotNull(rev_id)')
            elif is_undefined:
                sessions_conditions.append('isNull(rev_id)')
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not, value_key=f_k))

        elif f.type == schemas.FilterType.PLATFORM:
            # op = __ sh.get_sql_operator(f.operator)
            sessions_conditions.append(
                sh.multi_conditions(f"user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                    value_key=f_k))

        elif f.type == schemas.FilterType.ISSUE:
            if is_any:
                sessions_conditions.append("array_length(issue_types, 1) > 0")
            else:
                sessions_conditions.append(
                    sh.multi_conditions(f"has(issue_types,%({f_k})s)", f.value, is_not=is_not,
                                        value_key=f_k))

        elif f.type == schemas.FilterType.EVENTS_COUNT:
            sessions_conditions.append(
                sh.multi_conditions(f"events_count {op} %({f_k})s", f.value, is_not=is_not,
                                    value_key=f_k))

    if reverse:
        path_direction = "DESC"
    else:
        path_direction = ""

    ch_sub_query = __get_basic_constraints(table_name="events")
    selected_event_type_sub_query = []
    for s in data.metric_value:
        selected_event_type_sub_query.append(f"events.event_type = '{JOURNEY_TYPES[s]['eventType']}'")
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
                                   FROM (SELECT event_type, e_value
                                         FROM pre_ranked_events
                                         WHERE event_number_in_session = 1
                                         GROUP BY event_type, e_value
                                         ORDER BY count(1) DESC
                                         LIMIT 1) AS top_start_events
                                            INNER JOIN pre_ranked_events
                                                       ON (top_start_events.event_type = pre_ranked_events.event_type AND
                                                           top_start_events.e_value = pre_ranked_events.e_value)
                                   WHERE pre_ranked_events.event_number_in_session = 1"""
        initial_event_cte = ""
    else:
        step_0_subquery = f"""SELECT DISTINCT session_id
                                    FROM pre_ranked_events
                                    WHERE {" AND ".join(step_0_conditions)}"""
        initial_event_cte = f"""\
            initial_event AS (SELECT events.session_id, MIN(datetime) AS start_event_timestamp
                       FROM {main_events_table} {"INNER JOIN sub_sessions USING (session_id)" if len(sessions_conditions) > 0 else ""}
                       WHERE {" AND ".join(start_points_conditions)}
                       GROUP BY 1),"""
        ch_sub_query.append("events.datetime>=initial_event.start_event_timestamp")
        main_events_table += " INNER JOIN initial_event ON (events.session_id = initial_event.session_id)"
        sessions_conditions = []

    steps_query = ["""n1 AS (SELECT event_number_in_session,
                                    event_type,
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
                                                     re.event_type AS event_type,
                                                     re.e_value AS e_value,
                                                     re.next_type AS next_type,
                                                     re.next_value AS next_value,
                                                     COUNT(1) AS sessions_count
                                              FROM n{i - 1} INNER JOIN ranked_events AS re
                                                    ON (n{i - 1}.next_value = re.e_value AND n{i - 1}.next_type = re.event_type)
                                              WHERE re.event_number_in_session = {i}
                                              GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type, re.next_value) AS sub_level
                                        ORDER BY sessions_count DESC
                                        LIMIT %(eventThresholdNumberInGroup)s)""")
        projection_query.append(f"""SELECT event_number_in_session,
                                           event_type,
                                           e_value,
                                           next_type,
                                           next_value,
                                           sessions_count
                                    FROM n{i}""")

    with ch_client.ClickHouseClient(database="experimental") as ch:
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
                                        event_type,
                                        datetime,
                                        {main_column} AS e_value,
                                        row_number() OVER (PARTITION BY session_id 
                                                           ORDER BY datetime {path_direction},
                                                                    message_id {path_direction} ) AS event_number_in_session
                                 FROM {main_events_table} {"INNER JOIN sub_sessions ON (sub_sessions.session_id = events.session_id)" if len(sessions_conditions) > 0 else ""}
                                 WHERE {" AND ".join(ch_sub_query)}
                                 ) AS full_ranked_events
                           WHERE {" AND ".join(step_1_post_conditions)})
SELECT *
FROM pre_ranked_events;"""
        logger.debug("---------Q1-----------")
        ch.execute(query=ch_query1, parameters=params)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(ch.format(ch_query1, params))
            logger.warning("----------------------")
        _now = time()

        ch_query2 = f"""\
CREATE TEMPORARY TABLE ranked_events_{time_key} AS
WITH pre_ranked_events AS (SELECT *
                       FROM pre_ranked_events_{time_key}),
     start_points AS ({step_0_subquery}),
     ranked_events AS (SELECT pre_ranked_events.*,
                              leadInFrame(e_value)
                                          OVER (PARTITION BY session_id ORDER BY datetime {path_direction}
                                            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_value,
                              leadInFrame(toNullable(event_type))
                                          OVER (PARTITION BY session_id ORDER BY datetime {path_direction}
                                            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_type
                       FROM start_points INNER JOIN pre_ranked_events USING (session_id))
SELECT *
FROM ranked_events;"""
        logger.debug("---------Q2-----------")
        ch.execute(query=ch_query2, parameters=params)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(ch.format(ch_query2, params))
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
        rows = ch.execute(query=ch_query3, parameters=params)
        if time() - _now > 2:
            logger.warning(f">>>>>>>>>PathAnalysis long query EE ({int(time() - _now)}s)<<<<<<<<<")
            logger.warning(ch.format(ch_query3, params))
            logger.warning("----------------------")

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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
#         elif f.type in [schemas.FilterType.user_id, schemas.FilterType.user_id_mobile]:
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
