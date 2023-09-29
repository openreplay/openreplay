import random
from typing import List, Dict
from datetime import datetime, timedelta
from schemas import AssistStatsAverage, AssistStatsSession, schemas


def get_averages(start_timestamp: int, end_timestamp: int):
    return [
        AssistStatsAverage(
            key="January",
            avg=25.5,
            chartData=[
                {"timestamp": (start_timestamp + timedelta(hours=i)), "value": random.randint(20, 30)}
                for i in range(30)  # Generate 3 rows
            ]
        ),
        AssistStatsAverage(
            key="February",
            avg=22.0,
            chartData=[
                {"timestamp": (start_timestamp + timedelta(hours=i)), "value": random.randint(20, 30)}
                for i in range(30)  # Generate 3 rows
            ]
        ),
    ]


def get_top_members() -> schemas.AssistStatsTopMembersResponse:
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


def get_sessions() -> schemas.AssistStatsSessionsResponse:
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

    return schemas.AssistStatsSessionsResponse(
        total=100,
        page=1,
        list=data,
    )


def export_csv() -> schemas.AssistStatsSessionsResponse:
    data = get_sessions()
    return data
