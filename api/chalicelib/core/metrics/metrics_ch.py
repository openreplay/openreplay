import logging
from math import isnan

import schemas
from chalicelib.utils import ch_client
from chalicelib.utils import exp_ch_helper
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import get_step_size

logger = logging.getLogger(__name__)


def __get_basic_constraints(table_name=None, time_constraint=True, round_start=False, data={}, identifier="project_id"):
    if table_name:
        table_name += "."
    else:
        table_name = ""
    ch_sub_query = [f"{table_name}{identifier} =toUInt16(%({identifier})s)"]
    if time_constraint:
        if round_start:
            ch_sub_query.append(
                f"toStartOfInterval({table_name}datetime, INTERVAL %(step_size)s second) >= toDateTime(%(startTimestamp)s/1000)")
        else:
            ch_sub_query.append(f"{table_name}datetime >= toDateTime(%(startTimestamp)s/1000)")
        ch_sub_query.append(f"{table_name}datetime < toDateTime(%(endTimestamp)s/1000)")
    return ch_sub_query + __get_generic_constraint(data=data, table_name=table_name)


def __get_basic_constraints_events(table_name=None, time_constraint=True, round_start=False, data={},
                                   identifier="project_id"):
    if table_name:
        table_name += "."
    else:
        table_name = ""
    ch_sub_query = [f"{table_name}{identifier} =toUInt16(%({identifier})s)"]
    if time_constraint:
        if round_start:
            ch_sub_query.append(
                f"toStartOfInterval({table_name}created_at, INTERVAL %(step_size)s second) >= toDateTime(%(startTimestamp)s/1000)")
        else:
            ch_sub_query.append(f"{table_name}created_at >= toDateTime(%(startTimestamp)s/1000)")
        ch_sub_query.append(f"{table_name}created_at < toDateTime(%(endTimestamp)s/1000)")
    return ch_sub_query + __get_generic_constraint(data=data, table_name=table_name)


def __frange(start, stop, step):
    result = []
    i = start
    while i < stop:
        result.append(i)
        i += step
    return result


def __add_missing_keys(original, complete):
    for missing in [key for key in complete.keys() if key not in original.keys()]:
        original[missing] = complete[missing]
    return original


def __complete_missing_steps(start_time, end_time, density, neutral, rows, time_key="timestamp", time_coefficient=1000):
    if len(rows) == density:
        return rows
    step = get_step_size(start_time, end_time, density, decimal=True)
    optimal = [(int(i * time_coefficient), int((i + step) * time_coefficient)) for i in
               __frange(start_time // time_coefficient, end_time // time_coefficient, step)]
    result = []
    r = 0
    o = 0
    for i in range(density):
        neutral_clone = dict(neutral)
        for k in neutral_clone.keys():
            if callable(neutral_clone[k]):
                neutral_clone[k] = neutral_clone[k]()
        if r < len(rows) and len(result) + len(rows) - r == density:
            result += rows[r:]
            break
        if r < len(rows) and o < len(optimal) and rows[r][time_key] < optimal[o][0]:
            # complete missing keys in original object
            rows[r] = __add_missing_keys(original=rows[r], complete=neutral_clone)
            result.append(rows[r])
            r += 1
        elif r < len(rows) and o < len(optimal) and optimal[o][0] <= rows[r][time_key] < optimal[o][1]:
            # complete missing keys in original object
            rows[r] = __add_missing_keys(original=rows[r], complete=neutral_clone)
            result.append(rows[r])
            r += 1
            o += 1
        else:
            neutral_clone[time_key] = optimal[o][0]
            result.append(neutral_clone)
            o += 1
    return result


def __get_constraint(data, fields, table_name):
    constraints = []
    # for k in fields.keys():
    for i, f in enumerate(data.get("filters", [])):
        if f["key"] in fields.keys():
            if f["value"] in ["*", ""]:
                constraints.append(f"isNotNull({table_name}{fields[f['key']]})")
            else:
                constraints.append(f"{table_name}{fields[f['key']]} = %({f['key']}_{i})s")
    # TODO: remove this in next release
    offset = len(data.get("filters", []))
    for i, f in enumerate(data.keys()):
        if f in fields.keys():
            if data[f] in ["*", ""]:
                constraints.append(f"isNotNull({table_name}{fields[f]})")
            else:
                constraints.append(f"{table_name}{fields[f]} = %({f}_{i + offset})s")
    return constraints


def __get_constraint_values(data):
    params = {}
    for i, f in enumerate(data.get("filters", [])):
        params[f"{f['key']}_{i}"] = f["value"]

    # TODO: remove this in next release
    offset = len(data.get("filters", []))
    for i, f in enumerate(data.keys()):
        params[f"{f}_{i + offset}"] = data[f]
    return params


METADATA_FIELDS = {"userId": "user_id",
                   "userAnonymousId": "user_anonymous_id",
                   "metadata1": "metadata_1",
                   "metadata2": "metadata_2",
                   "metadata3": "metadata_3",
                   "metadata4": "metadata_4",
                   "metadata5": "metadata_5",
                   "metadata6": "metadata_6",
                   "metadata7": "metadata_7",
                   "metadata8": "metadata_8",
                   "metadata9": "metadata_9",
                   "metadata10": "metadata_10"}


def __get_meta_constraint(data):
    return __get_constraint(data=data, fields=METADATA_FIELDS, table_name="sessions_metadata.")


SESSIONS_META_FIELDS = {"revId": "rev_id",
                        "country": "user_country",
                        "os": "user_os",
                        "platform": "user_device_type",
                        "device": "user_device",
                        "browser": "user_browser"}


def __get_generic_constraint(data, table_name):
    return __get_constraint(data=data, fields=SESSIONS_META_FIELDS, table_name=table_name)


def get_user_activity_avg_visited_pages(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(), **args):
    results = {}

    with ch_client.ClickHouseClient() as ch:
        rows = __get_user_activity_avg_visited_pages(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
            for key in results:
                if isnan(results[key]):
                    results[key] = 0
        results["chart"] = __get_user_activity_avg_visited_pages_chart(ch, project_id, startTimestamp,
                                                                       endTimestamp, **args)

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_user_activity_avg_visited_pages(ch, project_id, startTimestamp, endTimestamp, **args)

        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results


def __get_user_activity_avg_visited_pages(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query.append("pages.event_type='LOCATION'")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    ch_query = f"""SELECT COALESCE(CEIL(avgOrNull(count)),0) AS value
                    FROM (SELECT COUNT(1) AS count 
                            FROM {exp_ch_helper.get_main_events_table(startTimestamp)} AS pages
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY session_id) AS groupped_data
                    WHERE count>0;"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    rows = ch.execute(query=ch_query, parameters=params)

    return rows


def __get_user_activity_avg_visited_pages_chart(ch, project_id, startTimestamp, endTimestamp, density=20, **args):
    step_size = get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    ch_sub_query_chart.append("pages.event_type='LOCATION'")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp, **__get_constraint_values(args)}
    ch_query = f"""SELECT timestamp, COALESCE(avgOrNull(count), 0) AS value
                    FROM (SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                            session_id, COUNT(1) AS count 
                          FROM {exp_ch_helper.get_main_events_table(startTimestamp)} AS pages
                          WHERE {" AND ".join(ch_sub_query_chart)}
                          GROUP BY timestamp,session_id
                          ORDER BY timestamp) AS groupped_data
                    WHERE count>0
                    GROUP BY timestamp
                    ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query, parameters=params)
    rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density, neutral={"value": 0})
    return rows


def get_unique_users(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    ch_sub_query_chart = __get_basic_constraints(table_name="sessions", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition
    ch_sub_query_chart.append("isNotNull(sessions.user_id)")
    ch_sub_query_chart.append("sessions.user_id!=''")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""\
                SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                       COUNT(DISTINCT sessions.user_id) AS value
                FROM {exp_ch_helper.get_main_sessions_table(startTimestamp)} AS sessions
                WHERE {" AND ".join(ch_sub_query_chart)}
                GROUP BY timestamp
                ORDER BY timestamp;\
        """
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}

        rows = ch.execute(query=ch_query, parameters=params)

        results = {
            "value": sum([r["value"] for r in rows]),
            "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp, end_time=endTimestamp,
                                              density=density,
                                              neutral={"value": 0})
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        ch_query = f""" SELECT COUNT(DISTINCT user_id) AS count
                        FROM {exp_ch_helper.get_main_sessions_table(startTimestamp)} AS sessions
                        WHERE {" AND ".join(ch_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        count = ch.execute(query=ch_query, parameters=params)

        count = count[0]["count"]

        results["progress"] = helper.__progress(old_val=count, new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results
