from typing import Optional

import schemas
from chalicelib.core.sourcemaps import sourcemaps


def __get_basic_constraints(platform: Optional[schemas.PlatformType] = None, time_constraint: bool = True,
                            startTime_arg_name: str = "startDate", endTime_arg_name: str = "endDate",
                            chart: bool = False, step_size_name: str = "step_size",
                            project_key: Optional[str] = "project_id"):
    if project_key is None:
        ch_sub_query = []
    else:
        ch_sub_query = [f"{project_key} =%(project_id)s"]
    if time_constraint:
        ch_sub_query += [f"timestamp >= %({startTime_arg_name})s",
                         f"timestamp < %({endTime_arg_name})s"]
    if chart:
        ch_sub_query += [f"timestamp >=  generated_timestamp",
                         f"timestamp <  generated_timestamp + %({step_size_name})s"]
    if platform == schemas.PlatformType.MOBILE:
        ch_sub_query.append("user_device_type = 'mobile'")
    elif platform == schemas.PlatformType.DESKTOP:
        ch_sub_query.append("user_device_type = 'desktop'")
    return ch_sub_query


def __get_basic_constraints_ch(platform=None, time_constraint=True, startTime_arg_name="startDate",
                               endTime_arg_name="endDate", type_condition=True, project_key="project_id",
                               table_name=None):
    ch_sub_query = [f"{project_key} =toUInt16(%(project_id)s)"]
    if table_name is not None:
        table_name = table_name + "."
    else:
        table_name = ""
    if type_condition:
        ch_sub_query.append(f"{table_name}`$event_name`='ERROR'")
    if time_constraint:
        ch_sub_query += [f"{table_name}datetime >= toDateTime(%({startTime_arg_name})s/1000)",
                         f"{table_name}datetime < toDateTime(%({endTime_arg_name})s/1000)"]
    if platform == schemas.PlatformType.MOBILE:
        ch_sub_query.append("user_device_type = 'mobile'")
    elif platform == schemas.PlatformType.DESKTOP:
        ch_sub_query.append("user_device_type = 'desktop'")
    return ch_sub_query


def format_first_stack_frame(error):
    error["stack"] = sourcemaps.format_payload(error.pop("payload"), truncate_to_first=True)
    for s in error["stack"]:
        for c in s.get("context", []):
            for sci, sc in enumerate(c):
                if isinstance(sc, str) and len(sc) > 1000:
                    c[sci] = sc[:1000]
        # convert bytes to string:
        if isinstance(s["filename"], bytes):
            s["filename"] = s["filename"].decode("utf-8")
    return error
