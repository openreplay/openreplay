from chalicelib.utils import ch_client
from .events_pg import *
from chalicelib.utils.exp_ch_helper import explode_dproperties, add_timestamp


def get_customs_by_session_id(session_id, project_id):
    with ch_client.ClickHouseClient() as cur:
        rows = cur.execute(""" \
                           SELECT `$properties`,
                                  properties,
                                  created_at,
                                  'CUSTOM' AS type,
                                  `$event_name` AS name   
                           FROM product_analytics.events
                           WHERE session_id = %(session_id)s
                             AND NOT `$auto_captured`
                             AND `$event_name`!='INCIDENT'
                           ORDER BY created_at;""",
                           {"project_id": project_id, "session_id": session_id})
    rows = helper.list_to_camel_case(rows, ignore_keys=["properties"])
    rows = explode_dproperties(rows)
    rows = add_timestamp(rows)
    return rows


def __merge_cells(rows, start, count, replacement):
    rows[start] = replacement
    rows = rows[:start + 1] + rows[start + count:]
    return rows


def __get_grouped_clickrage(rows, session_id, project_id):
    click_rage_issues = issues.get_by_session_id(session_id=session_id, issue_type="click_rage", project_id=project_id)
    if len(click_rage_issues) == 0:
        return rows

    for c in click_rage_issues:
        merge_count = c.get("payload")
        if merge_count is not None:
            merge_count = merge_count.get("Count", 3)
        else:
            merge_count = 3
        for i in range(len(rows)):
            if rows[i]["created_at"] == c["createdAt"]:
                rows = __merge_cells(rows=rows,
                                     start=i,
                                     count=merge_count,
                                     replacement={**rows[i], "type": "CLICKRAGE", "count": merge_count})
                break
    return rows


def get_by_session_id(session_id, project_id, group_clickrage=False, event_type: Optional[schemas.EventType] = None):
    with ch_client.ClickHouseClient() as cur:
        select_events = ('CLICK', 'INPUT', 'LOCATION')
        if event_type is not None:
            select_events = (event_type,)
        query = cur.format(query=""" \
                                 SELECT created_at,
                                        `$properties`,
                                        `$event_name` AS type
                                 FROM product_analytics.events
                                 WHERE session_id = %(session_id)s
                                   AND `$event_name` IN %(select_events)s
                                   AND `$auto_captured`
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id,
                                       "select_events": select_events})
        rows = cur.execute(query)
        rows = explode_dproperties(rows)
        if group_clickrage and 'CLICK' in select_events:
            rows = __get_grouped_clickrage(rows=rows, session_id=session_id, project_id=project_id)

        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["createdAt"])
    rows = add_timestamp(rows)
    return rows


def get_incidents_by_session_id(session_id, project_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=""" \
                                 SELECT created_at,
                                        `$properties`,
                                        `$event_name` AS type
                                 FROM product_analytics.events
                                 WHERE session_id = %(session_id)s
                                   AND `$event_name` = 'INCIDENT'
                                   AND `$auto_captured`
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id})
        rows = cur.execute(query)
        rows = explode_dproperties(rows)
        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["createdAt"])
    return rows
