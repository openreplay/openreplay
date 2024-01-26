import logging
from datetime import datetime

from fastapi import HTTPException

from chalicelib.utils import pg_client, helper
from schemas import AssistStatsSessionsRequest, AssistStatsSessionsResponse, AssistStatsTopMembersResponse

event_type_mapping = {
    "sessionsAssisted": "assist",
    "assistDuration": "assist",
    "callDuration": "call",
    "controlDuration": "control"
}


def insert_aggregated_data():
    try:
        logging.debug("Assist Stats: Inserting aggregated data")
        end_timestamp = int(datetime.timestamp(datetime.now())) * 1000
        start_timestamp = __last_run_end_timestamp_from_aggregates()

        if start_timestamp is None:  # first run
            logging.debug("Assist Stats: First run, inserting data for last 7 days")
            start_timestamp = end_timestamp - (7 * 24 * 60 * 60 * 1000)

        offset = 0
        chunk_size = 1000

        while True:
            constraints = [
                "timestamp BETWEEN %(start_timestamp)s AND %(end_timestamp)s"
            ]

            params = {
                "limit": chunk_size,
                "offset": offset,
                "start_timestamp": start_timestamp + 1,
                "end_timestamp": end_timestamp,
                "step_size": f"{60} seconds",
            }

            logging.debug(f"Assist Stats: Fetching data from {start_timestamp} to {end_timestamp}")
            aggregated_data = __get_all_events_hourly_averages(constraints, params)

            if not aggregated_data:  # No more data to insert
                logging.debug("Assist Stats: No more data to insert")
                break

            logging.debug(f"Assist Stats: Inserting {len(aggregated_data)} rows")

            for data in aggregated_data:
                sql = """
                    INSERT INTO assist_events_aggregates 
                    (timestamp, project_id, agent_id, assist_avg, call_avg, control_avg, assist_total, call_total, control_total)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                params = (
                    data['time'],
                    data['project_id'],
                    data['agent_id'],
                    data['assist_avg'],
                    data['call_avg'],
                    data['control_avg'],
                    data['assist_total'],
                    data['call_total'],
                    data['control_total']
                )

                with pg_client.PostgresClient() as cur:
                    cur.execute(sql, params)

            offset += chunk_size

        # get the first timestamp from the table assist_events based on start_timestamp
        sql = f"""
            SELECT MAX(timestamp) as first_timestamp
                FROM assist_events
            WHERE timestamp > %(start_timestamp)s AND duration > 0
            GROUP BY timestamp
            ORDER BY timestamp DESC LIMIT 1
        """
        with pg_client.PostgresClient() as cur:
            cur.execute(sql, params)
            result = cur.fetchone()
            first_timestamp = result['first_timestamp'] if result else None

        # insert the first timestamp into assist_events_aggregates_logs
        if first_timestamp is not None:
            sql = "INSERT INTO assist_events_aggregates_logs (time) VALUES (%s)"
            params = (first_timestamp,)
            with pg_client.PostgresClient() as cur:
                cur.execute(sql, params)

    except Exception as e:
        logging.error(f"Error inserting aggregated data -: {e}")


def __last_run_end_timestamp_from_aggregates():
    sql = "SELECT MAX(time) as last_run_time FROM assist_events_aggregates_logs;"
    with pg_client.PostgresClient() as cur:
        cur.execute(sql)
        result = cur.fetchone()
        last_run_time = result['last_run_time'] if result else None

    if last_run_time is None:  # first run handle all data
        sql = "SELECT MIN(timestamp) as last_timestamp FROM assist_events;"
        with pg_client.PostgresClient() as cur:
            cur.execute(sql)
            result = cur.fetchone()
            last_run_time = result['last_timestamp'] if result else None

    return last_run_time


def __get_all_events_hourly_averages(constraints, params):
    sql = f"""
        WITH time_series AS (
            SELECT
                EXTRACT(epoch FROM generate_series(
                    date_trunc('hour', to_timestamp(%(start_timestamp)s/1000)),
                    date_trunc('hour', to_timestamp(%(end_timestamp)s/1000)) + interval '1 hour',
                    interval %(step_size)s
                ))::bigint as unix_time
        )
        SELECT
            time_series.unix_time * 1000 as time,
            project_id,
            agent_id,
            ROUND(AVG(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END)) as assist_avg,
            ROUND(AVG(CASE WHEN event_type = 'call' THEN duration ELSE 0 END)) as call_avg,
            ROUND(AVG(CASE WHEN event_type = 'control' THEN duration ELSE 0 END)) as control_avg,
            ROUND(SUM(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END)) as assist_total,
            ROUND(SUM(CASE WHEN event_type = 'call' THEN duration ELSE 0 END)) as call_total,
            ROUND(SUM(CASE WHEN event_type = 'control' THEN duration ELSE 0 END)) as control_total
        FROM
            time_series
            LEFT JOIN assist_events ON time_series.unix_time = EXTRACT(epoch FROM DATE_TRUNC('hour', to_timestamp(assist_events.timestamp/1000)))
        WHERE
            {' AND '.join(f'{constraint}' for constraint in constraints)}
        GROUP BY time, project_id, agent_id
        ORDER BY time
        LIMIT %(limit)s OFFSET %(offset)s;
    """
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()
    return rows


def get_averages(
        project_id: int,
        start_timestamp: int,
        end_timestamp: int,
        user_id: int = None,
):
    constraints = [
        "project_id = %(project_id)s",
        "timestamp BETWEEN %(start_timestamp)s AND %(end_timestamp)s",
    ]

    params = {
        "project_id": project_id,
        "limit": 5,
        "offset": 0,
        "start_timestamp": start_timestamp,
        "end_timestamp": end_timestamp,
        "step_size": f"{60} seconds",
    }

    if user_id is not None:
        constraints.append("agent_id = %(agent_id)s")
        params["agent_id"] = user_id

    totals = __get_all_events_totals(constraints, params)
    rows = __get_all_events_averages(constraints, params)

    params["start_timestamp"] = start_timestamp - (end_timestamp - start_timestamp)
    params["end_timestamp"] = start_timestamp
    previous_totals = __get_all_events_totals(constraints, params)

    return {
        "currentPeriod": totals[0],
        "previousPeriod": previous_totals[0],
        "list": helper.list_to_camel_case(rows),
    }


def __get_all_events_totals(constraints, params):
    sql = f"""
       SELECT
           ROUND(SUM(assist_total))  as assist_total,
           ROUND(AVG(assist_avg))    as assist_avg,
           ROUND(SUM(call_total))    as call_total,
           ROUND(AVG(call_avg))      as call_avg,
           ROUND(SUM(control_total)) as control_total,
           ROUND(AVG(control_avg))   as control_avg
        FROM assist_events_aggregates
        WHERE {' AND '.join(f'{constraint}' for constraint in constraints)}
    """
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def __get_all_events_averages(constraints, params):
    sql = f"""
        SELECT
            timestamp,
            assist_avg,
            call_avg,
            control_avg,
            assist_total,
            call_total,
            control_total
        FROM assist_events_aggregates
        WHERE
            {' AND '.join(f'{constraint}' for constraint in constraints)}
        ORDER BY timestamp;
    """
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()
    return rows


def __get_all_events_averagesx(constraints, params):
    sql = f"""
        WITH time_series AS (
            SELECT
                EXTRACT(epoch FROM generate_series(
                    date_trunc('minute', to_timestamp(%(start_timestamp)s/1000)),
                    date_trunc('minute', to_timestamp(%(end_timestamp)s/1000)),
                    interval %(step_size)s
                ))::bigint as unix_time
        )
        SELECT
            time_series.unix_time as time,
            project_id,
            ROUND(AVG(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END)) as assist_avg,
            ROUND(AVG(CASE WHEN event_type = 'call' THEN duration ELSE 0 END)) as call_avg,
            ROUND(AVG(CASE WHEN event_type = 'control' THEN duration ELSE 0 END)) as control_avg,
            ROUND(SUM(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END)) as assist_total,
            ROUND(SUM(CASE WHEN event_type = 'call' THEN duration ELSE 0 END)) as call_total,
            ROUND(SUM(CASE WHEN event_type = 'control' THEN duration ELSE 0 END)) as control_total
        FROM
            time_series
            LEFT JOIN assist_events ON time_series.unix_time = EXTRACT(epoch FROM DATE_TRUNC('minute', to_timestamp(assist_events.timestamp/1000)))
        WHERE
            {' AND '.join(f'{constraint}' for constraint in constraints)}
        GROUP BY time, project_id
        ORDER BY time;

    """
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()
    return rows


def get_top_members(
        project_id: int,
        start_timestamp: int,
        end_timestamp: int,
        sort_by: str,
        sort_order: str,
        user_id: int = None,
        page: int = 0,
        limit: int = 5,
) -> AssistStatsTopMembersResponse:
    event_type = event_type_mapping.get(sort_by)
    if event_type is None:
        raise HTTPException(status_code=400, detail="Invalid sort option provided. Supported options are: " + ", ".join(
            event_type_mapping.keys()))

    constraints = [
        "project_id = %(project_id)s",
        "timestamp BETWEEN %(start_timestamp)s AND %(end_timestamp)s",
        # "duration > 0",
        # "event_type = %(event_type)s",
    ]

    params = {
        "project_id": project_id,
        "limit": limit,
        "offset": page,
        "sort_by": sort_by,
        "sort_order": sort_order.upper(),
        "start_timestamp": start_timestamp,
        "end_timestamp": end_timestamp,
        "event_type": event_type,
    }

    if user_id is not None:
        constraints.append("agent_id = %(agent_id)s")
        params["agent_id"] = user_id

    sql = f"""
        SELECT
            COUNT(1) OVER () AS total,
            ae.agent_id,
            u.name AS name,
            CASE WHEN '{sort_by}' = 'sessionsAssisted'
                 THEN SUM(CASE WHEN ae.event_type = 'assist' THEN 1 ELSE 0 END)
                 ELSE SUM(CASE WHEN ae.event_type = %(event_type)s THEN ae.duration ELSE 0 END)
            END AS count,
            SUM(CASE WHEN ae.event_type = 'assist' THEN ae.duration ELSE 0 END) AS assist_duration,
            SUM(CASE WHEN ae.event_type = 'call' THEN ae.duration ELSE 0 END) AS call_duration,
            SUM(CASE WHEN ae.event_type = 'control' THEN ae.duration ELSE 0 END) AS control_duration,
            SUM(CASE WHEN ae.event_type = 'assist' THEN 1 ELSE 0 END) AS assist_count
        FROM assist_events ae
            JOIN users u ON u.user_id = ae.agent_id
        WHERE {' AND '.join(f'ae.{constraint}' for constraint in constraints)}
            AND ae.event_type = '{event_type}'
        GROUP BY ae.agent_id, u.name
        ORDER BY count {params['sort_order']}
        LIMIT %(limit)s OFFSET %(offset)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    if len(rows) == 0:
        return AssistStatsTopMembersResponse(total=0, list=[])

    count = rows[0]["total"]
    rows = helper.list_to_camel_case(rows)
    for row in rows:
        row.pop("total")

    return AssistStatsTopMembersResponse(total=count, list=rows)


def get_sessions(
        project_id: int,
        data: AssistStatsSessionsRequest,
) -> AssistStatsSessionsResponse:
    constraints = [
        "project_id = %(project_id)s",
        "timestamp BETWEEN %(start_timestamp)s AND %(end_timestamp)s",
    ]

    params = {
        "project_id": project_id,
        "limit": data.limit,
        "offset": (data.page - 1) * data.limit,
        "sort_by": data.sort,
        "sort_order": data.order.upper(),
        "start_timestamp": data.startTimestamp,
        "end_timestamp": data.endTimestamp,
    }

    if data.userId is not None:
        constraints.append("agent_id = %(agent_id)s")
        params["agent_id"] = data.userId

    sql = f"""
        SELECT
            COUNT(1) OVER () AS count,
            ae.session_id,
            MIN(ae.timestamp) as timestamp,
            SUM(CASE WHEN ae.event_type = 'call' THEN ae.duration ELSE 0 END) AS call_duration,
            SUM(CASE WHEN ae.event_type = 'control' THEN ae.duration ELSE 0 END) AS control_duration,
            SUM(CASE WHEN ae.event_type = 'assist' THEN ae.duration ELSE 0 END) AS assist_duration,
            (SELECT json_agg(json_build_object('name', u.name, 'id', u.user_id))
                    FROM users u
                    WHERE u.user_id = ANY (array_agg(ae.agent_id)))                     AS team_members
        FROM assist_events ae
        WHERE {' AND '.join(f'ae.{constraint}' for constraint in constraints)}
        GROUP BY ae.session_id
        ORDER BY {params['sort_by']} {params['sort_order']}
        LIMIT %(limit)s OFFSET %(offset)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    if len(rows) == 0:
        return AssistStatsSessionsResponse(total=0, page=1, list=[])

    count = rows[0]["count"]

    rows = helper.list_to_camel_case(rows)
    for row in rows:
        row.pop("count")
    return AssistStatsSessionsResponse(total=count, page=data.page, list=rows)
