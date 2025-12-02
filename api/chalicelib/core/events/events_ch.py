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


def _numeric_property_available(props: dict, key: str) -> bool:
    return key in props \
        and (isinstance(props[key], str) and props[key].isnumeric() \
             or isinstance(props[key], int))


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
            row["hesitation"] = int(props["hesitation_time"]) \
                if _numeric_property_available(props, "hesitation_time") else props.get("hesitation_time")
            row["selector"] = props.get("selector")
        elif row["type"] == "INPUT":
            row["value"] = props.get("value")
            row["hesitation"] = int(props["hesitation_time"]) \
                if _numeric_property_available(props, "hesitation_time") else props.get("hesitation_time")
            row["duration"] *= 1000
        elif row["type"] == "LOCATION":
            parsed_url = urlparse(row["url"])
            row["host"] = parsed_url.hostname
            row["pageLoad"] = None  # TODO: find how to compute this value
            row["fcpTime"] = int(props["first_contentful_paint_time"]) \
                if _numeric_property_available(props, "first_contentful_paint_time") \
                else props.get("first_contentful_paint_time")
            row["loadTime"] = int(props["load_event_end"]) - int(props["load_event_start"]) \
                if _numeric_property_available(props, "load_event_end") \
                else None
            row["domContentLoadedTime"] = int(props["dom_content_loaded_event_end"]) \
                                          - int(props["dom_content_loaded_event_start"]) \
                if "dom_content_loaded_event_end" in props and \
                   (isinstance(props["dom_content_loaded_event_end"], str) \
                    and props["dom_content_loaded_event_end"].isnumeric() \
                    or isinstance(props["dom_content_loaded_event_end"], int)) \
                else None
            row["domBuildingTime"] = int(props["dom_building_time"]) \
                if _numeric_property_available(props, "dom_building_time") \
                else props.get("dom_building_time")
            row["speedIndex"] = int(props["speed_index"]) \
                if _numeric_property_available(props, "speed_index") \
                else props.get("speed_index")
            row["visuallyComplete"] = int(props["visually_complete"]) \
                if _numeric_property_available(props, "visually_complete") \
                else props.get("visually_complete")
            row["timeToInteractive"] = int(props["time_to_interactive"]) \
                if _numeric_property_available(props, "time_to_interactive") \
                else props.get("time_to_interactive")
            row["firstContentfulPaintTime"] = int(props["first_contentful_paint_time"]) \
                if _numeric_property_available(props, "first_contentful_paint_time") \
                else props.get("first_contentful_paint_time")
            row["firstPaintTime"] = props["first_paint"] \
                if _numeric_property_available(props, "first_paint") \
                else props.get("first_paint")


def get_by_session_id(session_id, project_id, group_clickrage=False, event_type: Optional[schemas.EventType] = None):
    with ch_client.ClickHouseClient() as cur:
        select_events = ('CLICK', 'INPUT', 'LOCATION', 'TAP')
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
    with ch_client.ClickHouseClient() as cur:
        rows = cur.execute(""" \
                           SELECT error_id,
                                  project_id,
                                  `$time` AS time,
                                `$properties`.source  AS source,
                                'ERROR'               AS name,
                                `$properties`.message AS message,
                                `$properties`.payload AS payload,
                                stacktrace,
                                stacktrace_parsed_at
                           FROM product_analytics.events
                               LEFT JOIN experimental.parsed_errors USING (error_id)
                           WHERE "$event_name" = 'ERROR'
                             AND session_id = %(session_id)s
                             AND project_id = %(project_id)s
                           ORDER BY created_at;""",
                           {"session_id": session_id, "project_id": project_id})
        for e in rows:
            e["stacktrace_parsed_at"] = TimeUTC.datetime_to_timestamp(e["stacktrace_parsed_at"])
        return helper.list_to_camel_case(rows)


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
                                   AND `$event_name` = 'ISSUE'
                                   AND `$auto_captured`
                                   AND issue_type = 'incident'
                                 ORDER BY created_at;""",
                           parameters={"project_id": project_id, "session_id": session_id})
        rows = cur.execute(query)
        # rows = explode_dproperties(rows)
        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["createdAt"])
    return rows


def get_mobile_crashes_by_session_id(session_id):
    with ch_client.ClickHouseClient() as cur:
        query = """SELECT `$properties`,
                          properties,
                          created_at,
                          'CRASH'       AS type,
                          `$event_name` AS name
                   FROM product_analytics.events
                   WHERE session_id = %(session_id)s
                     AND NOT `$auto_captured`
                     AND `$event_name` = 'CRASH'
                   ORDER BY created_at;"""
        rows = cur.execute(query, {"session_id": session_id})
        return helper.list_to_camel_case(rows)
