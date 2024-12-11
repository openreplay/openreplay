import decimal
import logging

import schemas
from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)
# This is the frequency of execution for each threshold
TimeInterval = {
    15: 3,
    30: 5,
    60: 10,
    120: 20,
    240: 30,
    1440: 60,
}


def __format_value(x):
    if x % 1 == 0:
        x = int(x)
    else:
        x = round(x, 2)
    return f"{x:,}"


def can_check(a) -> bool:
    now = TimeUTC.now()

    repetitionBase = a["options"]["currentPeriod"] \
        if a["detectionMethod"] == schemas.AlertDetectionMethod.CHANGE \
           and a["options"]["currentPeriod"] > a["options"]["previousPeriod"] \
        else a["options"]["previousPeriod"]

    if TimeInterval.get(repetitionBase) is None:
        logger.error(f"repetitionBase: {repetitionBase} NOT FOUND")
        return False

    return (a["options"]["renotifyInterval"] <= 0 or
            a["options"].get("lastNotification") is None or
            a["options"]["lastNotification"] <= 0 or
            ((now - a["options"]["lastNotification"]) > a["options"]["renotifyInterval"] * 60 * 1000)) \
        and ((now - a["createdAt"]) % (TimeInterval[repetitionBase] * 60 * 1000)) < 60 * 1000


def generate_notification(alert, result):
    left = __format_value(result['value'])
    right = __format_value(alert['query']['right'])
    return {
        "alertId": alert["alertId"],
        "tenantId": alert["tenantId"],
        "title": alert["name"],
        "description": f"{alert['seriesName']} = {left} ({alert['query']['operator']} {right}).",
        "buttonText": "Check metrics for more details",
        "buttonUrl": f"/{alert['projectId']}/metrics",
        "imageUrl": None,
        "projectId": alert["projectId"],
        "projectName": alert["projectName"],
        "options": {"source": "ALERT", "sourceId": alert["alertId"],
                    "sourceMeta": alert["detectionMethod"],
                    "message": alert["options"]["message"], "projectId": alert["projectId"],
                    "data": {"title": alert["name"],
                             "limitValue": alert["query"]["right"],
                             "actualValue": float(result["value"]) \
                                 if isinstance(result["value"], decimal.Decimal) \
                                 else result["value"],
                             "operator": alert["query"]["operator"],
                             "trigger": alert["query"]["left"],
                             "alertId": alert["alertId"],
                             "detectionMethod": alert["detectionMethod"],
                             "currentPeriod": alert["options"]["currentPeriod"],
                             "previousPeriod": alert["options"]["previousPeriod"],
                             "createdAt": TimeUTC.now()}},
    }
