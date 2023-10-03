import random
from typing import List, Dict
from datetime import datetime, timedelta
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
