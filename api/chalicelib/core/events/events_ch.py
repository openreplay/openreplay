from typing import Optional
from urllib.parse import urlparse

import schemas
from chalicelib.core.issues import issues
from chalicelib.utils import ch_client, pg_client
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.exp_ch_helper import explode_dproperties, add_timestamp
import json


def get_customs_by_session_id(session_id, project_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=""" \
                                 SELECT `$properties`,
                                        properties,
                                        created_at,
                                        'CUSTOM'      AS type,
                                        `$event_name` AS name
                                 FROM product_analytics.events
                                 WHERE session_id = %(session_id)s
                                   AND NOT `$auto_captured`
                                   AND `$event_name`!='INCIDENT'
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id})
        rows = cur.execute(query)
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


def extract_required_values(rows):
    for row in rows:
        # props = row.pop("$properties")
        props = json.loads(row.pop("p_properties"))
        row["label"] = props.get("label")
        # To remove extra attributes
        if row["type"] != "INPUT":
            row.pop("duration")
        if row["type"] != "LOCATION":
            row.pop("url")
            row.pop("referrer")

        # To extract/transform required attributes
        if row["type"] == "CLICK":
            row["hesitation"] = props.get("hesitation_time")
            row["selector"] = props.get("selector")
        elif row["type"] == "INPUT":
            row["value"] = props.get("value")
            row["hesitation"] = props.get("hesitation_time")
            row["duration"] *= 1000
        elif row["type"] == "LOCATION":
            parsed_url = urlparse(row["url"])
            row["host"] = parsed_url.hostname
            row["pageLoad"] = None  # TODO: find how to compute this value
            row["fcpTime"] = props.get("first_contentful_paint_time")
            row["loadTime"] = props["load_event_end"] - props["load_event_start"] \
                if "load_event_end" in props else None
            row["domContentLoadedTime"] = (props["dom_content_loaded_event_end"]
                                           - props["dom_content_loaded_event_start"]) \
                if "dom_content_loaded_event_end" in props else None
            row["domBuildingTime"] = props.get("dom_building_time")
            row["speedIndex"] = props.get("speed_index")
            row["visuallyComplete"] = props.get("visually_complete")
            row["timeToInteractive"] = props.get("time_to_interactive")
            row["firstContentfulPaintTime"] = props.get("first_contentful_paint_time")
            row["firstPaintTime"] = props.get("first_paint")


def get_by_session_id(session_id, project_id, group_clickrage=False, event_type: Optional[schemas.EventType] = None):
    with ch_client.ClickHouseClient() as cur:
        select_events = ('CLICK', 'INPUT', 'LOCATION')
        if event_type is not None:
            select_events = (event_type,)
        query = cur.format(query=""" \
                                 SELECT created_at,
                                        -- This is used because of an issue in clickhouse-python driver
                                        toString(`$properties`) AS p_properties,
                                        `$event_name`           AS type,
                                        `$duration_s`           AS duration,
                                        `$current_url`          AS url,
                                        `$referrer`             AS referrer
                                 FROM product_analytics.events
                                 WHERE session_id = %(session_id)s
                                   AND `$event_name` IN %(select_events)s
                                   AND `$auto_captured`
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id,
                                       "select_events": select_events})
        rows = cur.execute(query)
        # rows = explode_dproperties(rows)
        extract_required_values(rows)
        if group_clickrage and 'CLICK' in select_events:
            rows = __get_grouped_clickrage(rows=rows, session_id=session_id, project_id=project_id)

        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["createdAt"])
    rows = add_timestamp(rows)
    return rows


def get_errors_by_session_id(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""\
                    SELECT er.*,ur.*, er.timestamp - s.start_ts AS time
                    FROM events.errors AS er INNER JOIN public.errors AS ur USING (error_id) INNER JOIN public.sessions AS s USING (session_id)
                    WHERE er.session_id = %(session_id)s AND s.project_id=%(project_id)s
                    ORDER BY timestamp;""", {"session_id": session_id, "project_id": project_id}))
        errors = cur.fetchall()
        for e in errors:
            e["stacktrace_parsed_at"] = TimeUTC.datetime_to_timestamp(e["stacktrace_parsed_at"])
        return helper.list_to_camel_case(errors)


def get_incidents_by_session_id(session_id, project_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=""" \
                                 SELECT created_at,
                                        `$properties`.end_time   AS end_time,
                                        `$properties`.label      AS label,
                                        `$properties`.start_time AS start_time,
                                        `$event_name`            AS type
                                 FROM product_analytics.events
                                 WHERE session_id = %(session_id)s
                                   AND `$event_name` = 'INCIDENT'
                                   AND `$auto_captured`
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id})
        rows = cur.execute(query)
        # rows = explode_dproperties(rows)
        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["createdAt"])
    return rows
