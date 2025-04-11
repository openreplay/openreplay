from typing import List


def get_step_size(startTimestamp, endTimestamp, density, decimal=False, factor=1000):
    if endTimestamp == 0:
        raise Exception("endTimestamp cannot be 0 in order to get step size")
    step_size = (endTimestamp // factor - startTimestamp // factor)
    if density <= 1:
        return step_size
    if decimal:
        return step_size / density
    return step_size // density


def complete_missing_steps(rows: List[dict], start_timestamp: int, end_timestamp: int, step: int, neutral: dict,
                           time_key: str = "timestamp") -> List[dict]:
    result = []
    i = 0
    for t in range(start_timestamp, end_timestamp, step):
        if i >= len(rows) or rows[i][time_key] > t:
            neutral[time_key] = t
            result.append(neutral.copy())
        elif i < len(rows) and rows[i][time_key] == t:
            result.append(rows[i])
            i += 1
    return result
