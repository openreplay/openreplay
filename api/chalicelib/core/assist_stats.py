import random
from typing import List, Dict
from datetime import datetime, timedelta

from chalicelib.utils import pg_client
from schemas import AssistStatsAverage, AssistStatsSession, schemas


def get_averages(project_id: int, start_timestamp: int, end_timestamp: int):
    if start_timestamp is None:
        start_datetime = datetime.utcnow() - timedelta(days=1)
    else:
        start_datetime = datetime.utcfromtimestamp(start_timestamp)

    averages = []
    for month in range(1, 3):  # Generate data for January and February
        month_name = datetime(2000, month, 1).strftime('%B')
        chart_data = [
            {"timestamp": int((start_datetime + timedelta(hours=i)).timestamp()), "value": random.randint(20, 30)}
            for i in range(30)
        ]
        averages.append(AssistStatsAverage(key=month_name, avg=22.0, chartData=chart_data))

    return averages


def get_top_members(
        project_id: int,
        start_timestamp: int,
        end_timestamp: int,
        sort_by: str,
        sort_order: str,
) -> schemas.AssistStatsTopMembersResponse:
    data = []

    for _ in range(5):  # Change the range to the desired number of data points
        name = f"Person {_}"
        value = random.randint(1, 10)  # Adjust the range as needed
        data.append({"name": name, "count": value})

    return schemas.AssistStatsTopMembersResponse(
        total=100,
        page=1,
        list=data,
    )


def get_sessions(
        project_id: int,
        data: schemas.AssistStatsSessionsRequest,
) -> schemas.AssistStatsSessionsResponse:
    data = []

    sql = """
        WITH EventDurations AS (SELECT ae.session_id AS "sessionId",
                                   ae.event_type,
                                   SUM(CASE WHEN ae.event_state = 'start' THEN ae.timestamp ELSE 0 END) AS start_time,
                                   SUM(CASE WHEN ae.event_state = 'end' THEN ae.timestamp ELSE 0 END)   AS end_time
                            FROM assist_events ae
                            WHERE ae.event_type IN ('live', 'call', 'remote')
                            GROUP BY ae.session_id, ae.event_type)
    
        SELECT ed."sessionId",
               MIN(ae.timestamp)                                                             AS "date",
               array_agg(DISTINCT ae.agent_id)                                               AS "agentIds",
               SUM(CASE WHEN ed.event_type = 'live' THEN end_time - start_time ELSE 0 END)   AS "liveDuration",
               SUM(CASE WHEN ed.event_type = 'call' THEN end_time - start_time ELSE 0 END)   AS "callDuration",
               SUM(CASE WHEN ed.event_type = 'remote' THEN end_time - start_time ELSE 0 END) AS "remoteDuration"
        FROM EventDurations ed
                 LEFT JOIN assist_events ae ON ed."sessionId" = ae.session_id
        GROUP BY ed."sessionId"
        ORDER BY "liveDuration" DESC
        LIMIT 10 OFFSET 1;
    """

    params = {
        "project_id": project_id,
    }

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    for _ in range(5):
        data.append(AssistStatsSession(
            sessionId=f"{_}",
            timestamp=1641000000,
            teamMembers=[{"name": f"Person {_}", "id": f"{_}"}],
            liveDuration=random.randint(1, 50),
            callDuration=random.randint(1, 40),
            remoteDuration=random.randint(1, 30),
        ))

    data[0].recordings = [
        {
            "id": f"record_1",
            "name": f"Recording {1}",
            "duration": random.randint(1, 2000),
        }
    ]

    data[1].recordings = [
        {
            "id": f"record_1",
            "name": f"Recording {1}",
            "duration": random.randint(1, 2000),
        },
        {
            "id": f"record_2",
            "name": f"Recording {2}",
            "duration": random.randint(1, 2000),
        }
    ]

    return schemas.AssistStatsSessionsResponse(
        total=100,
        page=1,
        list=data,
    )


def export_csv() -> schemas.AssistStatsSessionsResponse:
    data = get_sessions()
    return data
