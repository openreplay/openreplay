import math

import schemas
from chalicelib.utils import pg_client
from chalicelib.utils import args_transformer
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils import ch_client
from math import isnan
from chalicelib.utils.metrics_helper import __get_step_size


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
    step = __get_step_size(start_time, end_time, density, decimal=True)
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
        # elif r < len(rows) and rows[r][time_key] >= optimal[o][1]:
        #     neutral_clone[time_key] = optimal[o][0]
        #     result.append(neutral_clone)
        #     o += 1
        # else:
        #     neutral_clone[time_key] = optimal[o][0]
        #     result.append(neutral_clone)
        #     o += 1
    return result


def __merge_charts(list1, list2, time_key="timestamp"):
    if len(list1) != len(list2):
        raise Exception("cannot merge unequal lists")
    result = []
    for i in range(len(list1)):
        timestamp = min(list1[i][time_key], list2[i][time_key])
        result.append({**list1[i], **list2[i], time_key: timestamp})
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


def get_processed_sessions(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(),
                           density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    ch_sub_query_chart = __get_basic_constraints(table_name="sessions", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""\
                SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                       COUNT(DISTINCT sessions.session_id) AS value
                FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                WHERE {" AND ".join(ch_sub_query_chart)}
                GROUP BY timestamp
                ORDER BY timestamp;\
        """
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}

        rows = ch.execute(query=ch_query, params=params)

        results = {
            "value": sum([r["value"] for r in rows]),
            "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp, end_time=endTimestamp,
                                              density=density,
                                              neutral={"value": 0})
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        ch_query = f""" SELECT COUNT(1) AS count
                        FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        count = ch.execute(query=ch_query, params=params)

        count = count[0]["count"]

        results["progress"] = helper.__progress(old_val=count, new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.count
    return results


def get_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
               density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)

    ch_sub_query = __get_basic_constraints(table_name="errors", data=args)
    ch_sub_query.append("errors.source = 'js_exception'")
    ch_sub_query_chart = __get_basic_constraints(table_name="errors", round_start=True, data=args)
    ch_sub_query_chart.append("errors.source = 'js_exception'")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""\
                    SELECT toUnixTimestamp(toStartOfInterval(errors.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                           COUNT(DISTINCT errors.session_id) AS count
                    FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query_chart)}
                    GROUP BY timestamp
                    ORDER BY timestamp;\
            """
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = {
            "count": 0 if len(rows) == 0 else __count_distinct_errors(ch, project_id, startTimestamp, endTimestamp,
                                                                      ch_sub_query),
            "impactedSessions": sum([r["count"] for r in rows]),
            "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp, end_time=endTimestamp,
                                              density=density,
                                              neutral={"count": 0})
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        count = __count_distinct_errors(ch, project_id, startTimestamp, endTimestamp, ch_sub_query,
                                        meta=len(meta_condition) > 0, **args)
        results["progress"] = helper.__progress(old_val=count, new_val=results["count"])
    return results


def __count_distinct_errors(ch, project_id, startTimestamp, endTimestamp, ch_sub_query, meta=False, **args):
    ch_query = f"""\
                SELECT
                       COUNT(DISTINCT errors.message) AS count
                FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if meta else ""}
                WHERE {" AND ".join(ch_sub_query)};"""
    count = ch.execute(query=ch_query,
                       params={"project_id": project_id, "startTimestamp": startTimestamp,
                               "endTimestamp": endTimestamp, **__get_constraint_values(args)})

    if count is not None and len(count) > 0:
        return count[0]["count"]

    return 0


def get_errors_trend(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(),
                     density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="errors", data=args)
    ch_sub_query_chart = __get_basic_constraints(table_name="errors", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT *
                        FROM (SELECT errors.error_id            AS error_id,
                                     errors.message             AS error,
                                     COUNT(1)   AS count,
                                     COUNT(DISTINCT errors.session_id) AS sessions
                              FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                              WHERE {" AND ".join(ch_sub_query)}
                              GROUP BY errors.error_id, errors.message) AS errors_chart
                            INNER JOIN (SELECT error_id AS error_id, 
                                            toUnixTimestamp(MAX(datetime))*1000 AS lastOccurrenceAt, 
                                            toUnixTimestamp(MIN(datetime))*1000 AS firstOccurrenceAt
                             FROM errors
                             GROUP BY error_id) AS errors_time USING(error_id)
                        ORDER BY sessions DESC, count DESC LIMIT 10;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)

        # print(f"got {len(rows)} rows")
        if len(rows) == 0:
            return []
        error_ids = [r["error_id"] for r in rows]
        ch_sub_query.append("error_id = %(error_id)s")
        errors = {}
        for error_id in error_ids:
            ch_query = f"""\
                        SELECT toUnixTimestamp(toStartOfInterval(errors.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                               COUNT(1) AS count
                        FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
            params["error_id"] = error_id
            errors[error_id] = ch.execute(query=ch_query, params=params)

        for row in rows:
            row["startTimestamp"] = startTimestamp
            row["endTimestamp"] = endTimestamp
            row["chart"] = __complete_missing_steps(rows=errors[row["error_id"]], start_time=startTimestamp,
                                                    end_time=endTimestamp,
                                                    density=density,
                                                    neutral={"count": 0})

    return rows


def get_page_metrics(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        rows = __get_page_metrics(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_page_metrics(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            for key in previous.keys():
                results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_page_metrics(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("(pages.dom_content_loaded_event_end>0 OR pages.first_contentful_paint>0)")
    # changed dom_content_loaded_event_start to dom_content_loaded_event_end
    ch_query = f"""SELECT COALESCE(avgOrNull(NULLIF(pages.dom_content_loaded_event_end ,0)),0) AS avg_dom_content_load_start,
                           COALESCE(avgOrNull(NULLIF(pages.first_contentful_paint,0)),0)  AS avg_first_contentful_pixel
                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    rows = ch.execute(query=ch_query, params=params)
    return rows


def get_application_activity(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        row = __get_application_activity(ch, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_application_activity(ch, project_id, startTimestamp, endTimestamp, **args)
        previous = helper.dict_to_camel_case(row)
        for key in previous.keys():
            results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_application_activity(ch, project_id, startTimestamp, endTimestamp, **args):
    result = {}
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    ch_query = f"""SELECT COALESCE(avgOrNull(pages.load_event_end),0) AS avg_page_load_time
                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)} AND pages.load_event_end>0;"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    row = ch.execute(query=ch_query, params=params)[0]
    result = {**result, **row}

    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("resources.type= %(type)s")
    ch_query = f"""SELECT COALESCE(avgOrNull(resources.duration),0) AS avg 
                    FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)} AND resources.duration>0;"""
    row = ch.execute(query=ch_query,
                     params={"project_id": project_id, "type": 'img', "startTimestamp": startTimestamp,
                             "endTimestamp": endTimestamp, **__get_constraint_values(args)})[0]
    result = {**result, "avg_image_load_time": row["avg"]}
    row = ch.execute(query=ch_query,
                     params={"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp,
                             "endTimestamp": endTimestamp, **__get_constraint_values(args)})[0]
    result = {**result, "avg_request_load_time": row["avg"]}

    for k in result:
        if result[k] is None:
            result[k] = 0
    return result


def get_user_activity(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                      endTimestamp=TimeUTC.now(), **args):
    results = {}

    with ch_client.ClickHouseClient() as ch:
        rows = __get_user_activity(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
            for key in results:
                if isnan(results[key]):
                    results[key] = 0
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_user_activity(ch, project_id, startTimestamp, endTimestamp, **args)

        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            for key in previous:
                results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_user_activity(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("(sessions.pages_count>0 OR sessions.duration>0)")
    ch_query = f"""SELECT COALESCE(CEIL(avgOrNull(NULLIF(sessions.pages_count,0))),0) AS avg_visited_pages,
                           COALESCE(avgOrNull(NULLIF(sessions.duration,0)),0)          AS avg_session_duration
                    FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    rows = ch.execute(query=ch_query, params=params)

    return rows


def get_slowest_images(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(),
                       density=7, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("resources.type = 'img'")
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    ch_sub_query_chart.append("resources.type = 'img'")
    ch_sub_query_chart.append("resources.url IN %(url)s")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT resources.url,
                              COALESCE(avgOrNull(resources.duration),0) AS avg,
                              COUNT(1) AS count 
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                        WHERE {" AND ".join(ch_sub_query)} AND resources.duration>0
                        GROUP BY resources.url ORDER BY avg DESC LIMIT 10;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)

        rows = [{"url": i["url"], "avgDuration": i["avg"], "sessions": i["count"]} for i in rows]
        if len(rows) == 0:
            return []
        urls = [row["url"] for row in rows]

        charts = {}
        ch_query = f"""SELECT url, 
                               toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                               COALESCE(avgOrNull(resources.duration),0) AS avg
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)} AND resources.duration>0
                        GROUP BY url, timestamp
                        ORDER BY url, timestamp;"""
        params["url"] = urls
        u_rows = ch.execute(query=ch_query, params=params)
        for url in urls:
            sub_rows = []
            for r in u_rows:
                if r["url"] == url:
                    sub_rows.append(r)
                elif len(sub_rows) > 0:
                    break
            charts[url] = [{"timestamp": int(i["timestamp"]),
                            "avgDuration": i["avg"]}
                           for i in __complete_missing_steps(rows=sub_rows, start_time=startTimestamp,
                                                             end_time=endTimestamp,
                                                             density=density, neutral={"avg": 0})]
        for i in range(len(rows)):
            rows[i] = helper.dict_to_camel_case(rows[i])
            rows[i]["chart"] = helper.list_to_camel_case(charts[rows[i]["url"]])

    return sorted(rows, key=lambda k: k["sessions"], reverse=True)


def __get_performance_constraint(l):
    if len(l) == 0:
        return ""
    l = [s.decode('UTF-8').replace("%", "%%") for s in l]
    return f"AND ({' OR '.join(l)})"


def get_performance(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                    density=19, resources=None, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    location_constraints = []
    img_constraints = []
    request_constraints = []
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    img_constraints_vals = {}
    location_constraints_vals = {}
    request_constraints_vals = {}

    if resources and len(resources) > 0:
        for r in resources:
            if r["type"] == "IMG":
                img_constraints.append(f"resources.url = %(val_{len(img_constraints)})s")
                img_constraints_vals["val_" + str(len(img_constraints) - 1)] = r['value']
            elif r["type"] == "LOCATION":
                location_constraints.append(f"pages.url_path = %(val_{len(location_constraints)})s")
                location_constraints_vals["val_" + str(len(location_constraints) - 1)] = r['value']
            else:
                request_constraints.append(f"resources.url = %(val_{len(request_constraints)})s")
                request_constraints_vals["val_" + str(len(request_constraints) - 1)] = r['value']
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(resources.duration),0) AS avg 
                      FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)}
                          AND resources.type = 'img' AND resources.duration>0 
                          {(f' AND ({" OR ".join(img_constraints)})') if len(img_constraints) > 0 else ""}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params={**params, **img_constraints_vals, **__get_constraint_values(args)})
        images = [{"timestamp": i["timestamp"], "avgImageLoadTime": i["avg"]} for i in
                  __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                           end_time=endTimestamp,
                                           density=density, neutral={"avg": 0})]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(resources.duration),0) AS avg 
                      FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)} 
                          AND resources.type = 'fetch' AND resources.duration>0  
                          {(f' AND ({" OR ".join(request_constraints)})') if len(request_constraints) > 0 else ""}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query,
                          params={**params, **request_constraints_vals, **__get_constraint_values(args)})
        requests = [{"timestamp": i["timestamp"], "avgRequestLoadTime": i["avg"]} for i in
                    __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                             end_time=endTimestamp, density=density,
                                             neutral={"avg": 0})]
        ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True,
                                                     data=args)
        ch_sub_query_chart += meta_condition

        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(pages.load_event_end),0) AS avg 
                      FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)} AND pages.load_event_end>0 
                          {(f' AND ({" OR ".join(location_constraints)})') if len(location_constraints) > 0 else ""}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""

        rows = ch.execute(query=ch_query,
                          params={**params, **location_constraints_vals, **__get_constraint_values(args)})
        pages = [{"timestamp": i["timestamp"], "avgPageLoadTime": i["avg"]} for i in
                 __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                          end_time=endTimestamp,
                                          density=density, neutral={"avg": 0})]

        rows = helper.merge_lists_by_key(helper.merge_lists_by_key(pages, requests, "timestamp"), images, "timestamp")

        for s in rows:
            for k in s:
                if s[k] is None:
                    s[k] = 0
    return {"chart": helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                        end_time=endTimestamp,
                                                                        density=density,
                                                                        neutral={"avgImageLoadTime": 0,
                                                                                 "avgRequestLoadTime": 0,
                                                                                 "avgPageLoadTime": 0}))}


RESOURCS_TYPE_TO_DB_TYPE = {
    "img": "IMG",
    "fetch": "REQUEST",
    "stylesheet": "STYLESHEET",
    "script": "SCRIPT",
    "other": "OTHER",
    "media": "MEDIA"
}


def __get_resource_type_from_db_type(db_type):
    db_type = db_type.lower()
    return RESOURCS_TYPE_TO_DB_TYPE.get(db_type, db_type)


def __get_resource_db_type_from_type(resource_type):
    resource_type = resource_type.upper()
    return {v: k for k, v in RESOURCS_TYPE_TO_DB_TYPE.items()}.get(resource_type, resource_type)


def search(text, resource_type, project_id, performance=False, pages_only=False, events_only=False,
           metadata=False, key=None, platform=None):
    if not resource_type:
        data = []
        if metadata:
            resource_type = "METADATA"
        elif pages_only or performance:
            resource_type = "LOCATION"
        else:
            resource_type = "ALL"
        data.extend(search(text=text, resource_type=resource_type, project_id=project_id,
                           performance=performance, pages_only=pages_only, events_only=events_only, key=key,
                           platform=platform))
        return data

    ch_sub_query = __get_basic_constraints(time_constraint=False,
                                           data={} if platform is None else {"platform": platform})

    if resource_type == "ALL" and not pages_only and not events_only:
        ch_sub_query.append("positionUTF8(url_hostpath,%(value)s)!=0")
        with ch_client.ClickHouseClient() as ch:
            ch_query = f"""SELECT arrayJoin(arraySlice(arrayReverseSort(arrayDistinct(groupArray(url))), 1, 5)) AS value,
                                  type AS key
                          FROM resources 
                          WHERE {" AND ".join(ch_sub_query)} 
                          GROUP BY type
                          ORDER BY type ASC;"""
            rows = ch.execute(query=ch_query,
                              params={"project_id": project_id,
                                      "value": text})
            rows = [{"value": i["value"], "type": __get_resource_type_from_db_type(i["key"])} for i in rows]
    elif resource_type == "ALL" and events_only:
        with ch_client.ClickHouseClient() as ch:
            ch_query = f"""(SELECT DISTINCT label AS value, 'INPUT' AS key
                             FROM inputs
                             WHERE {" AND ".join(ch_sub_query)} AND positionUTF8(lowerUTF8(label), %(value)s) != 0
                             LIMIT 10)
                            UNION ALL
                            (SELECT DISTINCT label AS value, 'CLICK' AS key
                             FROM clicks
                             WHERE {" AND ".join(ch_sub_query)} AND positionUTF8(lowerUTF8(label), %(value)s) != 0
                             LIMIT 10)
                            UNION ALL
                            (SELECT DISTINCT url_path AS value, 'LOCATION'   AS key
                             FROM pages
                             WHERE {" AND ".join(ch_sub_query)} AND positionUTF8(url_path, %(value)s) != 0
                             LIMIT 10);"""
            rows = ch.execute(query=ch_query,
                              params={"project_id": project_id,
                                      "value": text.lower(),
                                      "platform_0": platform})
            rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type in ['IMG', 'REQUEST', 'STYLESHEET', 'OTHER', 'SCRIPT'] and not pages_only:
        ch_sub_query.append("positionUTF8(url_hostpath,%(value)s)!=0")
        ch_sub_query.append(f"resources.type = '{__get_resource_db_type_from_type(resource_type)}'")

        with ch_client.ClickHouseClient() as ch:
            ch_query = f"""SELECT DISTINCT url_hostpath AS value,
                                  %(resource_type)s AS key
                          FROM resources 
                          WHERE {" AND ".join(ch_sub_query)} 
                          LIMIT 10;"""
            rows = ch.execute(query=ch_query,
                              params={"project_id": project_id,
                                      "value": text,
                                      "resource_type": resource_type,
                                      "platform_0": platform})
            rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type == 'LOCATION':
        with ch_client.ClickHouseClient() as ch:
            ch_sub_query.append("positionUTF8(url_path,%(value)s)!=0")
            ch_query = f"""SELECT 
                             DISTINCT url_path AS value,
                             'LOCATION' AS key
                          FROM pages 
                          WHERE {" AND ".join(ch_sub_query)} 
                          LIMIT 10;"""
            rows = ch.execute(query=ch_query,
                              params={"project_id": project_id,
                                      "value": text,
                                      "platform_0": platform})
            rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type == "INPUT":
        with ch_client.ClickHouseClient() as ch:
            ch_sub_query.append("positionUTF8(lowerUTF8(label), %(value)s) != 0")
            ch_query = f"""SELECT DISTINCT label AS value, 'INPUT' AS key
                             FROM inputs
                             WHERE {" AND ".join(ch_sub_query)}
                             LIMIT 10;"""
        rows = ch.execute(query=ch_query,
                          params={"project_id": project_id,
                                  "value": text.lower(),
                                  "platform_0": platform})
        rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type == "CLICK":
        with ch_client.ClickHouseClient() as ch:
            ch_sub_query.append("positionUTF8(lowerUTF8(label), %(value)s) != 0")
            ch_query = f"""SELECT DISTINCT label AS value, 'CLICK' AS key
                             FROM clicks
                             WHERE {" AND ".join(ch_sub_query)}
                             LIMIT 10;"""
        rows = ch.execute(query=ch_query,
                          params={"project_id": project_id,
                                  "value": text.lower(),
                                  "platform_0": platform})
        rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type == "METADATA":
        if key and len(key) > 0 and key in {**METADATA_FIELDS, **SESSIONS_META_FIELDS}.keys():
            if key in METADATA_FIELDS.keys():
                ch_sub_query.append(
                    f"positionCaseInsensitiveUTF8(sessions_metadata.{METADATA_FIELDS[key]},%(value)s)>0")

                with ch_client.ClickHouseClient() as ch:
                    ch_query = f"""SELECT  DISTINCT sessions_metadata.{METADATA_FIELDS[key]} AS value,
                                              %(key)s AS key
                                          FROM sessions_metadata INNER JOIN sessions USING(session_id)
                                          WHERE {" AND ".join(ch_sub_query)} 
                                          LIMIT 10;"""
                    rows = ch.execute(query=ch_query,
                                      params={"project_id": project_id, "value": text, "key": key,
                                              "platform_0": platform})
            else:
                ch_sub_query.append(f"positionCaseInsensitiveUTF8(sessions.{SESSIONS_META_FIELDS[key]},%(value)s)>0")

                with ch_client.ClickHouseClient() as ch:
                    ch_query = f"""SELECT DISTINCT sessions.{SESSIONS_META_FIELDS[key]} AS value,
                                          '{key}' AS key
                                  FROM sessions
                                  WHERE {" AND ".join(ch_sub_query)} 
                                  LIMIT 10;"""
                    rows = ch.execute(query=ch_query, params={"project_id": project_id, "value": text, "key": key,
                                                              "platform_0": platform})
        else:
            with ch_client.ClickHouseClient() as ch:
                ch_query = []
                for k in METADATA_FIELDS.keys():
                    ch_query.append(f"""(SELECT DISTINCT sessions_metadata.{METADATA_FIELDS[k]} AS value,
                                          '{k}' AS key
                                      FROM sessions_metadata INNER JOIN sessions USING(session_id)
                                      WHERE {" AND ".join(ch_sub_query)} AND positionCaseInsensitiveUTF8(sessions_metadata.{METADATA_FIELDS[k]},%(value)s)>0 
                                      LIMIT 10)""")
                for k in SESSIONS_META_FIELDS.keys():
                    if k in ["platform", "country"]:
                        continue
                    ch_query.append(f"""(SELECT DISTINCT sessions.{SESSIONS_META_FIELDS[k]} AS value,
                                          '{k}' AS key
                                      FROM sessions
                                      WHERE {" AND ".join(ch_sub_query)} AND positionCaseInsensitiveUTF8(sessions.{SESSIONS_META_FIELDS[k]},%(value)s)>0 
                                      LIMIT 10)""")
                ch_query = " UNION ALL ".join(ch_query)

                rows = ch.execute(query=ch_query, params={"project_id": project_id, "value": text, "key": key,
                                                          "platform_0": platform})
    else:
        return []
    return [helper.dict_to_camel_case(row) for row in rows]


def get_missing_resources_trend(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                endTimestamp=TimeUTC.now(),
                                density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("resources.success = 0")
    ch_sub_query.append("resources.type = 'img'")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT resources.url_hostpath AS key,
                              COUNT(1) AS doc_count
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                      GROUP BY url_hostpath
                      ORDER BY doc_count DESC
                      LIMIT 10;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)

        rows = [{"url": i["key"], "sessions": i["doc_count"]} for i in rows]
        if len(rows) == 0:
            return []
        ch_sub_query.append("resources.url_hostpath = %(value)s")
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COUNT(1) AS doc_count,
                              toUnixTimestamp(MAX(resources.datetime))*1000 AS max_datatime
                      FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query)}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
        for e in rows:
            e["startedAt"] = startTimestamp
            e["startTimestamp"] = startTimestamp
            e["endTimestamp"] = endTimestamp
            params["value"] = e["url"]
            r = ch.execute(query=ch_query, params=params)

            e["endedAt"] = r[-1]["max_datatime"]
            e["chart"] = [{"timestamp": i["timestamp"], "count": i["doc_count"]} for i in
                          __complete_missing_steps(rows=r, start_time=startTimestamp,
                                                   end_time=endTimestamp,
                                                   density=density,
                                                   neutral={"doc_count": 0})]
    return rows


def get_network(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(),
                density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              resources.url_hostpath, COUNT(1) AS doc_count
                      FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)}
                      GROUP BY timestamp, resources.url_hostpath
                      ORDER BY timestamp, doc_count DESC
                      LIMIT 10 BY timestamp;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        r = ch.execute(query=ch_query, params=params)

        results = []

        i = 0
        while i < len(r):
            results.append({"timestamp": r[i]["timestamp"], "domains": []})
            i += 1
            while i < len(r) and r[i]["timestamp"] == results[-1]["timestamp"]:
                results[-1]["domains"].append({r[i]["url_hostpath"]: r[i]["doc_count"]})
                i += 1

    return {"startTimestamp": startTimestamp, "endTimestamp": endTimestamp, "chart": results}


KEYS = {
    'startTimestamp': args_transformer.int_arg,
    'endTimestamp': args_transformer.int_arg,
    'density': args_transformer.int_arg,
    'performanceDensity': args_transformer.int_arg,
    'platform': args_transformer.string
}


def dashboard_args(params):
    args = {}
    if params is not None:
        for key in params.keys():
            if key in KEYS.keys():
                args[key] = KEYS[key](params.get(key))
    return args


def get_resources_loading_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                               endTimestamp=TimeUTC.now(),
                               density=19, type=None, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    if type is not None:
        ch_sub_query_chart.append(f"resources.type = '{__get_resource_db_type_from_type(type)}'")
    if url is not None:
        ch_sub_query_chart.append(f"resources.url = %(value)s")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition
    ch_sub_query_chart.append("resources.duration>0")

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(resources.duration),0) AS avg 
                          FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                          WHERE {" AND ".join(ch_sub_query_chart)} 
                          GROUP BY timestamp
                          ORDER BY timestamp;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, "type": type, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(resources.duration),0) AS avg 
                      FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"avg": avg, "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                          end_time=endTimestamp,
                                                          density=density,
                                                          neutral={"avg": 0})}


def get_pages_dom_build_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), density=19, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    if url is not None:
        ch_sub_query_chart.append(f"pages.url_path = %(value)s")
    ch_sub_query_chart.append("isNotNull(pages.dom_building_time)")
    ch_sub_query_chart.append("pages.dom_building_time>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(pages.dom_building_time),0) AS value 
                          FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                          WHERE {" AND ".join(ch_sub_query_chart)} 
                          GROUP BY timestamp
                          ORDER BY timestamp;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.dom_building_time),0) AS avg 
                      FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0

    results = {"value": avg,
               "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                 end_time=endTimestamp,
                                                 density=density, neutral={"value": 0})}
    helper.__time_value(results)
    return results


def get_slowest_resources(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                          endTimestamp=TimeUTC.now(), type="all", density=19, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("isNotNull(resources.url_hostpath)")
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query_chart += meta_condition

    if type is not None and type.upper() != "ALL":
        sq = f"resources.type = '{__get_resource_db_type_from_type(type.upper())}'"
    else:
        sq = "resources.type != 'fetch'"
    ch_sub_query.append(sq)
    ch_sub_query_chart.append(sq)
    ch_sub_query_chart.append("isNotNull(resources.duration)")
    ch_sub_query_chart.append("resources.duration>0")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT any(url) AS url, any(type) AS type,
                              splitByChar('/', resources.url_hostpath)[-1] AS name,
                              COALESCE(avgOrNull(NULLIF(resources.duration,0)),0) AS avg 
                          FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                          WHERE {" AND ".join(ch_sub_query)}
                          GROUP BY name
                          ORDER BY avg DESC
                          LIMIT 10;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        if len(rows) == 0:
            return []
        ch_sub_query.append(ch_sub_query_chart[-1])
        results = []
        names = {f"name_{i}": r["name"] for i, r in enumerate(rows)}
        ch_query = f"""SELECT splitByChar('/', resources.url_hostpath)[-1] AS name,
                            toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                            COALESCE(avgOrNull(resources.duration),0) AS avg 
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                            AND ({" OR ".join([f"endsWith(resources.url_hostpath, %(name_{i})s)>0" for i in range(len(names.keys()))])})
                        GROUP BY name,timestamp
                        ORDER BY name,timestamp;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  **names, **__get_constraint_values(args)}
        charts = ch.execute(query=ch_query, params=params)
        for r in rows:
            sub_chart = []
            for c in charts:
                if c["name"] == r["name"]:
                    cc = dict(c)
                    cc.pop("name")
                    sub_chart.append(cc)
                elif len(sub_chart) > 0:
                    break
            r["chart"] = __complete_missing_steps(rows=sub_chart, start_time=startTimestamp,
                                                  end_time=endTimestamp,
                                                  density=density, neutral={"avg": 0})
            r["type"] = __get_resource_type_from_db_type(r["type"])
            results.append(r)

    return results


def get_sessions_location(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                          endTimestamp=TimeUTC.now(), **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT user_country, COUNT(1) AS count
                        FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)} 
                        GROUP BY user_country
                        ORDER BY user_country;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return {"count": sum(i["count"] for i in rows), "chart": helper.list_to_camel_case(rows)}


def get_speed_index_location(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query.append("isNotNull(pages.speed_index)")
    ch_sub_query.append("pages.speed_index>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT pages.user_country, COALESCE(avgOrNull(pages.speed_index),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)} 
                        GROUP BY pages.user_country
                        ORDER BY value ,pages.user_country;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.speed_index),0) AS avg
                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"value": avg, "chart": helper.list_to_camel_case(rows), "unit": schemas.TemplatePredefinedUnits.millisecond}


def get_pages_response_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                            endTimestamp=TimeUTC.now(), density=7, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    ch_sub_query_chart.append("isNotNull(pages.response_time)")
    ch_sub_query_chart.append("pages.response_time>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    if url is not None:
        ch_sub_query_chart.append(f"url_path = %(value)s")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                        COALESCE(avgOrNull(pages.response_time),0)                                        AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)} 
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.response_time),0) AS avg
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    results = {"value": avg,
               "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                 end_time=endTimestamp,
                                                 density=density, neutral={"value": 0})}
    helper.__time_value(results)
    return results


def get_pages_response_time_distribution(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                         endTimestamp=TimeUTC.now(), density=20, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query.append("isNotNull(pages.response_time)")
    ch_sub_query.append("pages.response_time>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT pages.response_time AS response_time,
                              COUNT(1) AS count
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)} 
                        GROUP BY response_time
                        ORDER BY response_time;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.response_time),0) AS avg
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"]
        quantiles_keys = [50, 90, 95, 99]
        ch_query = f"""SELECT quantilesExact({",".join([str(i / 100) for i in quantiles_keys])})(pages.response_time) AS values
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)};"""
        quantiles = ch.execute(query=ch_query, params=params)
    result = {
        "value": avg,
        "total": sum(r["count"] for r in rows),
        "chart": [],
        "percentiles": [{
            "percentile": v,
            "responseTime": (
                quantiles[0]["values"][i] if quantiles[0]["values"][i] is not None and not math.isnan(
                    quantiles[0]["values"][i]) else 0)} for i, v in enumerate(quantiles_keys)
        ],
        "extremeValues": [{"count": 0}],
        "unit": schemas.TemplatePredefinedUnits.millisecond
    }
    if len(rows) > 0:
        rows = helper.list_to_camel_case(rows)
        _99 = result["percentiles"][-1]["responseTime"]
        extreme_values_first_index = -1
        for i, r in enumerate(rows):
            if r["responseTime"] > _99:
                extreme_values_first_index = i
                break

        if extreme_values_first_index >= 0:
            extreme_values_first_index += 1
            result["extremeValues"][0]["count"] = sum(r["count"] for r in rows[extreme_values_first_index:])
            # result["extremeValues"][0]["responseTime"] = rows[extreme_values_first_index]["responseTime"]

            rows = rows[:extreme_values_first_index]

        # ------- Merge points to reduce chart length till density
        if density < len(quantiles_keys):
            density = len(quantiles_keys)

        while len(rows) > density:
            true_length = len(rows)
            rows_partitions = []
            offset = 0
            for p in result["percentiles"]:
                rows_partitions.append([])
                for r in rows[offset:]:
                    if r["responseTime"] < p["responseTime"]:
                        rows_partitions[-1].append(r)
                        offset += 1
                    else:
                        break
            rows_partitions.append(rows[offset:])
            # print(f"len rows partition: {len(rows_partitions)}")
            # for r in rows_partitions:
            #     print(f"{r[0]}  => {sum(v['count'] for v in r)}")

            largest_partition = 0
            for i in range(len(rows_partitions)):
                if len(rows_partitions[i]) > len(rows_partitions[largest_partition]):
                    largest_partition = i
            # print(f"largest partition: {len(rows_partitions[largest_partition])}")

            if len(rows_partitions[largest_partition]) <= 2:
                break
            # computing lowest merge diff
            diff = rows[-1]["responseTime"]
            for i in range(1, len(rows_partitions[largest_partition]) - 1, 1):
                v1 = rows_partitions[largest_partition][i]
                v2 = rows_partitions[largest_partition][i + 1]
                if (v2["responseTime"] - v1["responseTime"]) < diff:
                    diff = v2["responseTime"] - v1["responseTime"]
            # print(f"lowest merge diff: {diff}")
            i = 1
            while i < len(rows_partitions[largest_partition]) - 1 and true_length > density - 1:
                v1 = rows_partitions[largest_partition][i]
                v2 = rows_partitions[largest_partition][i + 1]
                if (v2["responseTime"] - v1["responseTime"]) == diff:
                    rows_partitions[largest_partition][i]["count"] += v2["count"]
                    rows_partitions[largest_partition][i]["responseTime"] = v2["responseTime"]
                    del rows_partitions[largest_partition][i + 1]
                    true_length -= 1
                else:
                    i += 1

            rows = [r for rp in rows_partitions for r in rp]

        if extreme_values_first_index == len(rows):
            rows.append({"count": 0, "responseTime": rows[-1]["responseTime"] + 10})

        result["chart"] = rows

    return result


def get_busiest_time_of_day(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                            endTimestamp=TimeUTC.now(), **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT intDiv(toHour(sessions.datetime),2)*2 AS hour,
                              COUNT(1) AS count
                        FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY hour
                        ORDER BY hour ASC;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return __complete_missing_steps(rows=rows, start_time=0, end_time=24000, density=12,
                                    neutral={"count": 0},
                                    time_key="hour", time_coefficient=1)


def get_top_metrics(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                    endTimestamp=TimeUTC.now(), value=None, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(if(pages.response_time>0,pages.response_time,null)),0) AS avg_response_time,
                              COALESCE(avgOrNull(if(pages.first_paint>0,pages.first_paint,null)),0) AS avg_first_paint,
                              COALESCE(avgOrNull(if(pages.dom_content_loaded_event_time>0,pages.dom_content_loaded_event_time,null)),0) AS avg_dom_content_loaded,
                              COALESCE(avgOrNull(if(pages.ttfb>0,pages.ttfb,null)),0) AS avg_till_first_bit,
                              COALESCE(avgOrNull(if(pages.time_to_interactive>0,pages.time_to_interactive,null)),0) AS avg_time_to_interactive,
                            (SELECT COUNT(1) FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} WHERE {" AND ".join(ch_sub_query)}) AS count_requests
                            FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                            WHERE {" AND ".join(ch_sub_query)} 
                                AND (isNotNull(pages.response_time) AND pages.response_time>0 OR
                                     isNotNull(pages.first_paint) AND pages.first_paint>0 OR
                                     isNotNull(pages.dom_content_loaded_event_time) AND pages.dom_content_loaded_event_time>0 OR
                                     isNotNull(pages.ttfb) AND pages.ttfb>0 OR
                                     isNotNull(pages.time_to_interactive) AND pages.time_to_interactive >0);"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return helper.dict_to_camel_case(rows[0])


def get_time_to_render(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(), density=7, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    ch_sub_query_chart.append("isNotNull(pages.visually_complete)")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    if url is not None:
        ch_sub_query_chart.append("pages.url_path = %(value)s")

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                        COALESCE(avgOrNull(pages.visually_complete),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)} 
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, "value": url, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.visually_complete),0) AS avg
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    results = {"value": avg, "chart": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                               end_time=endTimestamp, density=density,
                                                               neutral={"value": 0})}
    helper.__time_value(results)
    return results


def get_impacted_sessions_by_slow_pages(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(), value=None, density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    ch_sub_query.append("isNotNull(pages.response_time)")
    ch_sub_query.append("pages.response_time>0")
    sch_sub_query = ch_sub_query[:]
    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                              COUNT(DISTINCT pages.session_id) AS count
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                            AND (pages.response_time)>(SELECT COALESCE(avgOrNull(pages.response_time),0) 
                                                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                                                    WHERE {" AND ".join(sch_sub_query)})*2
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query,
                          params={"step_size": step_size,
                                  "project_id": project_id,
                                  "startTimestamp": startTimestamp,
                                  "endTimestamp": endTimestamp,
                                  "value": value, **__get_constraint_values(args)})
    return __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp, density=density,
                                    neutral={"count": 0})


def get_memory_consumption(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="performance", round_start=True,
                                                 data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(performance.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                              COALESCE(avgOrNull(performance.avg_used_js_heap_size),0) AS value
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(performance.avg_used_js_heap_size),0) AS avg
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"value": avg,
            "chart": helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                        end_time=endTimestamp,
                                                                        density=density,
                                                                        neutral={"value": 0})),
            "unit": schemas.TemplatePredefinedUnits.memory}


def get_avg_cpu(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="performance", round_start=True,
                                                 data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(performance.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                              COALESCE(avgOrNull(performance.avg_cpu),0) AS value
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(performance.avg_cpu),0) AS avg
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"value": avg,
            "chart": helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                        end_time=endTimestamp,
                                                                        density=density,
                                                                        neutral={"value": 0})),
            "unit": schemas.TemplatePredefinedUnits.percentage}


def get_avg_fps(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="performance", round_start=True,
                                                 data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(performance.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                              COALESCE(avgOrNull(performance.avg_fps),0) AS value
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(performance.avg_fps),0) AS avg
                        FROM performance {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"value": avg,
            "chart": helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                        end_time=endTimestamp,
                                                                        density=density,
                                                                        neutral={"value": 0})),
            "unit": schemas.TemplatePredefinedUnits.frame}


def __get_crashed_sessions_ids(project_id, startTimestamp, endTimestamp):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""\
            SELECT session_id
            FROM public.sessions
            WHERE sessions.project_id = %(project_id)s
                AND 'crash' = ANY (sessions.issue_types)
                AND sessions.start_ts >= %(startDate)s 
                AND sessions.start_ts <= %(endDate)s;""",
            {"project_id": project_id, "startDate": startTimestamp, "endDate": endTimestamp}
        )
        cur.execute(query=query)
        return [r["session_id"] for r in cur.fetchall()]


def get_crashes(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    session_ids = __get_crashed_sessions_ids(project_id, startTimestamp, endTimestamp)
    if len(session_ids) > 0:
        session_ids = tuple(session_ids)
        ch_sub_query = __get_basic_constraints(table_name="sessions", round_start=True, data=args)
        ch_sub_query.append("sessions.session_id IN %(session_ids)s")
        ch_sub_query_chart = __get_basic_constraints(table_name="sessions", round_start=True,
                                                     data=args)
        ch_sub_query_chart.append("sessions.session_id IN %(session_ids)s")
        meta_condition = __get_meta_constraint(args)
        ch_sub_query += meta_condition
        ch_sub_query_chart += meta_condition

        with ch_client.ClickHouseClient() as ch:
            ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                            COUNT(1) AS value
                            FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query_chart)} 
                            GROUP BY timestamp
                            ORDER BY timestamp;"""
            params = {"step_size": step_size,
                      "project_id": project_id,
                      "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp,
                      "session_ids": session_ids, **__get_constraint_values(args)}
            rows = ch.execute(query=ch_query, params=params)
            ch_query = f"""SELECT b.user_browser AS browser,
                                    sum(bv.count) AS total,
                                   groupArray([bv.user_browser_version, toString(bv.count)]) AS versions
                            FROM (
                                     SELECT sessions.user_browser
                                     FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                     WHERE {" AND ".join(ch_sub_query)}
                                     GROUP BY sessions.user_browser
                                     ORDER BY COUNT(1) DESC
                                     LIMIT 3
                                 ) AS b
                                     INNER JOIN
                                 (
                                     SELECT sessions.user_browser,
                                            sessions.user_browser_version,
                                            COUNT(1) AS count
                                     FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                     WHERE {" AND ".join(ch_sub_query)}
                                     GROUP BY sessions.user_browser,
                                              sessions.user_browser_version
                                     ORDER BY count DESC
                                 ) AS bv USING (user_browser)
                            GROUP BY b.user_browser
                            ORDER BY b.user_browser;"""
            browsers = ch.execute(query=ch_query, params=params)
            total = sum(r["total"] for r in browsers)
            for r in browsers:
                r["percentage"] = r["total"] / (total / 100)
                versions = []
                for i in range(len(r["versions"][:3])):
                    versions.append({r["versions"][i][0]: int(r["versions"][i][1]) / (r["total"] / 100)})
                r["versions"] = versions
    else:
        rows = []
        browsers = []
    result = {"chart": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                end_time=endTimestamp,
                                                density=density,
                                                neutral={"value": 0}),
              "browsers": browsers,
              "unit": schemas.TemplatePredefinedUnits.count}
    return result


def __get_domains_errors_neutral(rows):
    neutral = {l: 0 for l in [i for k in [list(v.keys()) for v in rows] for i in k]}
    if len(neutral.keys()) == 0:
        neutral = {"All": 0}
    return neutral


def __merge_rows_with_neutral(rows, neutral):
    for i in range(len(rows)):
        rows[i] = {**neutral, **rows[i]}
    return rows


def get_domains_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    ch_sub_query.append("intDiv(resources.status, 100) == %(status_code)s")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT timestamp,
                               groupArray([domain, toString(count)]) AS keys
                        FROM (SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                                        resources.url_host AS domain, COUNT(1) AS count
                                FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                WHERE {" AND ".join(ch_sub_query)} 
                                GROUP BY timestamp,resources.url_host
                                ORDER BY timestamp, count DESC 
                                LIMIT 5 BY timestamp) AS domain_stats
                        GROUP BY timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": 4, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_domains_errors_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        result = {"4xx": __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                  end_time=endTimestamp,
                                                  density=density, neutral=neutral)}
        params["status_code"] = 5
        rows = ch.execute(query=ch_query, params=params)
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_domains_errors_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)
        result["5xx"] = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                 end_time=endTimestamp,
                                                 density=density, neutral=neutral)
    return result


def __get_domains_errors_4xx_and_5xx(status, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                     endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    ch_sub_query.append("intDiv(resources.status, 100) == %(status_code)s")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT timestamp,
                               groupArray([domain, toString(count)]) AS keys
                        FROM (SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                                        resources.url_host AS domain, COUNT(1) AS count
                                FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                WHERE {" AND ".join(ch_sub_query)} 
                                GROUP BY timestamp,resources.url_host
                                ORDER BY timestamp, count DESC 
                                LIMIT 5 BY timestamp) AS domain_stats
                        GROUP BY timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": status, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_domains_errors_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        return __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                        end_time=endTimestamp,
                                        density=density, neutral=neutral)


def get_domains_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    return __get_domains_errors_4xx_and_5xx(status=4, project_id=project_id, startTimestamp=startTimestamp,
                                            endTimestamp=endTimestamp, density=density, **args)


def get_domains_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    return __get_domains_errors_4xx_and_5xx(status=5, project_id=project_id, startTimestamp=startTimestamp,
                                            endTimestamp=endTimestamp, density=density, **args)


def __nested_array_to_dict_array(rows):
    for r in rows:
        for i in range(len(r["keys"])):
            r[r["keys"][i][0]] = int(r["keys"][i][1])
        r.pop("keys")
    return rows


def get_slowest_domains(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                        endTimestamp=TimeUTC.now(), **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("isNotNull(resources.duration)")
    ch_sub_query.append("resources.duration>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT resources.url_host AS domain,
                              COALESCE(avgOrNull(resources.duration),0) AS value
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY resources.url_host
                        ORDER BY value DESC
                        LIMIT 5;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        ch_query = f"""SELECT COALESCE(avgOrNull(resources.duration),0) AS avg
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)};"""
        avg = ch.execute(query=ch_query, params=params)[0]["avg"] if len(rows) > 0 else 0
    return {"value": avg, "chart": rows, "unit": schemas.TemplatePredefinedUnits.millisecond}


def get_errors_per_domains(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("resources.success = 0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT
                            resources.url_host AS domain,
                            COUNT(1) AS errors_count
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY resources.url_host
                        ORDER BY errors_count DESC
                        LIMIT 5;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return helper.list_to_camel_case(rows)


def get_sessions_per_browser(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                             platform=None, **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT b.user_browser AS browser,
                              b.count,
                              groupArray([bv.user_browser_version, toString(bv.count)]) AS versions
                    FROM
                    (
                        SELECT sessions.user_browser,
                               COUNT(1) AS count
                        FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY sessions.user_browser
                        ORDER BY count DESC
                        LIMIT 3
                    ) AS b
                    INNER JOIN
                    (
                        SELECT sessions.user_browser,
                               sessions.user_browser_version,
                               COUNT(1) AS count
                        FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY
                            sessions.user_browser,
                            sessions.user_browser_version
                        ORDER BY count DESC
                        LIMIT 3
                    ) AS bv USING (user_browser)
                    GROUP BY
                        b.user_browser, b.count
                    ORDER BY b.count DESC;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    for i, r in enumerate(rows):
        versions = {}
        for j in range(len(r["versions"])):
            versions[r["versions"][j][0]] = int(r["versions"][j][1])
        r.pop("versions")
        rows[i] = {**r, **versions}
    return {"count": sum(i["count"] for i in rows), "chart": rows}


def get_calls_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                     platform=None, **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("resources.type = 'fetch'")
    ch_sub_query.append("intDiv(resources.status, 100) != 2")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT  resources.method,
                               resources.url_hostpath,
                               COUNT(1)                           AS all_requests,
                               SUM(if(intDiv(resources.status, 100) == 4, 1, 0)) AS _4xx,
                               SUM(if(intDiv(resources.status, 100) == 5, 1, 0)) AS _5xx
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY resources.method, resources.url_hostpath
                        ORDER BY (_4xx + _5xx) DESC, all_requests DESC
                        LIMIT 50;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return helper.list_to_camel_case(rows)


def __get_calls_errors_4xx_or_5xx(status, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                  endTimestamp=TimeUTC.now(),
                                  platform=None, **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    ch_sub_query.append("resources.type = 'fetch'")
    ch_sub_query.append(f"intDiv(resources.status, 100) == {status}")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT  resources.method,
                               resources.url_hostpath,
                               COUNT(1)                           AS all_requests
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query)}
                        GROUP BY resources.method, resources.url_hostpath
                        ORDER BY all_requests DESC
                        LIMIT 10;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return helper.list_to_camel_case(rows)


def get_calls_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    return __get_calls_errors_4xx_or_5xx(status=4, project_id=project_id, startTimestamp=startTimestamp,
                                         endTimestamp=endTimestamp,
                                         platform=platform, **args)


def get_calls_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    return __get_calls_errors_4xx_or_5xx(status=5, project_id=project_id, startTimestamp=startTimestamp,
                                         endTimestamp=endTimestamp,
                                         platform=platform, **args)


def get_errors_per_type(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                        platform=None, density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart_r = __get_basic_constraints(table_name="resources", round_start=True,
                                                   data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart_r += meta_condition
    ch_sub_query_chart_e = __get_basic_constraints(table_name="errors", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart_e += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                               SUM(count_4xx)                                                                      AS _4xx,
                               SUM(count_5xx)                                                                      AS _5xx,
                               SUM(count_js)                                                                       AS js,
                               SUM(count_be)                                                                       AS integrations
                        FROM ((SELECT resources.datetime, 1 AS count_4xx, 0 AS count_5xx, 0 AS count_js, 0 AS count_be
                              FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                              WHERE {" AND ".join(ch_sub_query_chart_r)} AND resources.type = 'fetch' AND intDiv(resources.status, 100) == 4)
                        UNION ALL
                        (SELECT resources.datetime, 0 AS count_4xx, 1 AS count_5xx, 0 AS count_js, 0 AS count_be
                         FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                         WHERE {" AND ".join(ch_sub_query_chart_r)} AND resources.type = 'fetch' AND intDiv(resources.status, 100) == 5)
                        UNION ALL
                        (SELECT errors.datetime, 0 AS count_4xx, 0 AS count_5xx, 1 AS count_js, 0 AS count_be
                         FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                         WHERE {" AND ".join(ch_sub_query_chart_e)} AND errors.source == 'js_exception')
                        UNION ALL
                        (SELECT errors.datetime, 0 AS count_4xx, 0 AS count_5xx, 0 AS count_js, 1 AS count_be
                         FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                         WHERE {" AND ".join(ch_sub_query_chart_e)} AND errors.source != 'js_exception')
                        ) AS errors_partition
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = helper.list_to_camel_case(ch.execute(query=ch_query, params=params))

    return __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density,
                                    neutral={"4xx": 0, "5xx": 0, "js": 0, "integrations": 0})


def resource_type_vs_response_end(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                  endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    ch_sub_query_chart_response_end = __get_basic_constraints(table_name="pages", round_start=True,
                                                              data=args)
    ch_sub_query_chart_response_end.append("isNotNull(pages.response_end)")
    ch_sub_query_chart_response_end.append("pages.response_end>0")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition
    ch_sub_query_chart_response_end += meta_condition
    params = {"step_size": step_size,
              "project_id": project_id,
              "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp, **__get_constraint_values(args)}
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                              COUNT(1) AS total,
                              SUM(if(resources.type='fetch',1,0)) AS xhr
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        actions = ch.execute(query=ch_query, params=params)
        actions = __complete_missing_steps(rows=actions, start_time=startTimestamp,
                                           end_time=endTimestamp,
                                           density=density,
                                           neutral={"total": 0, "xhr": 0})
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp, 
                              COALESCE(avgOrNull(pages.response_end),0) AS avg_response_end
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart_response_end)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        response_end = ch.execute(query=ch_query, params=params)
        response_end = __complete_missing_steps(rows=response_end, start_time=startTimestamp,
                                                end_time=endTimestamp,
                                                density=density,
                                                neutral={"avg_response_end": 0})
    return helper.list_to_camel_case(__merge_charts(response_end, actions))


def get_impacted_sessions_by_js_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="errors", round_start=True, data=args)
    ch_sub_query_chart.append("errors.source == 'js_exception'")
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(errors.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                              COUNT(DISTINCT errors.session_id) AS sessions_count,
                              COUNT(DISTINCT errors.error_id) AS errors_count
                        FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;;"""
        rows = ch.execute(query=ch_query,
                          params={"step_size": step_size,
                                  "project_id": project_id,
                                  "startTimestamp": startTimestamp,
                                  "endTimestamp": endTimestamp, **__get_constraint_values(args)})
        ch_query = f"""SELECT   COUNT(DISTINCT errors.session_id) AS sessions_count,
                                COUNT(DISTINCT errors.error_id) AS errors_count
                        FROM errors {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)};"""
        counts = ch.execute(query=ch_query,
                            params={"step_size": step_size,
                                    "project_id": project_id,
                                    "startTimestamp": startTimestamp,
                                    "endTimestamp": endTimestamp, **__get_constraint_values(args)})
    return {"sessionsCount": counts[0]["sessions_count"],
            "errorsCount": counts[0]["errors_count"],
            "chart": helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                        end_time=endTimestamp,
                                                                        density=density,
                                                                        neutral={"sessions_count": 0,
                                                                                 "errors_count": 0}))}


def get_resources_vs_visually_complete(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(s.base_datetime, toIntervalSecond(%(step_size)s))) * 1000 AS timestamp,
                              COALESCE(avgOrNull(NULLIF(s.count,0)),0) AS avg,
                              groupArray([toString(t.type), toString(t.xavg)]) AS types
                        FROM
                        (   SELECT resources.session_id,
                                   MIN(resources.datetime) AS base_datetime,
                                   COUNT(1) AS count
                            FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY resources.session_id
                        ) AS s
                        INNER JOIN
                        (SELECT session_id,
                                 type,
                                 COALESCE(avgOrNull(NULLIF(count,0)),0) AS xavg
                          FROM (SELECT resources.session_id, resources.type, COUNT(1) AS count
                                FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                                WHERE {" AND ".join(ch_sub_query)}
                                GROUP BY resources.session_id, resources.type) AS ss
                          GROUP BY ss.session_id, ss.type) AS t USING (session_id)
                        GROUP BY timestamp
                        ORDER BY timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    for r in rows:
        types = {}
        for i in range(len(r["types"])):
            if r["types"][i][0] not in types:
                types[r["types"][i][0]] = []
            types[r["types"][i][0]].append(float(r["types"][i][1]))
        for i in types:
            types[i] = sum(types[i]) / len(types[i])
        r["types"] = types
    resources = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                         end_time=endTimestamp,
                                         density=density,
                                         neutral={"avg": 0, "types": {}})
    time_to_render = get_time_to_render(project_id=project_id, startTimestamp=startTimestamp,
                                        endTimestamp=endTimestamp, density=density,
                                        **args)

    return helper.list_to_camel_case(
        __merge_charts(
            [{"timestamp": i["timestamp"], "avgCountResources": i["avg"], "types": i["types"]} for i in resources],
            [{"timestamp": i["timestamp"], "avgTimeToRender": i["value"]} for i in time_to_render["chart"]]))


def get_resources_count_by_type(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT timestamp,
                        groupArray([toString(t.type), toString(t.count)]) AS types
                        FROM(SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                            resources.type,
                            COUNT(1) AS count
                        FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)} 
                        GROUP BY timestamp,resources.type
                        ORDER BY timestamp) AS t
                        GROUP BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        for r in rows:
            for t in r["types"]:
                r[t[0]] = t[1]
            r.pop("types")
    return __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density,
                                    neutral={k: 0 for k in RESOURCS_TYPE_TO_DB_TYPE.keys()})


def get_resources_by_party(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    ch_sub_query.append("resources.success = 0")
    ch_sub_query.append("resources.type IN ('fetch','script')")
    sch_sub_query = ["rs.project_id =toUInt16(%(project_id)s)", "rs.type IN ('fetch','script')"]
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    # sch_sub_query += meta_condition

    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(sub_resources.datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                            SUM(first.url_host = sub_resources.url_host) AS first_party,
                            SUM(first.url_host != sub_resources.url_host) AS third_party
                        FROM 
                        (
                            SELECT resources.datetime, resources.url_host 
                            FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                        ) AS sub_resources
                        CROSS JOIN 
                        (
                            SELECT
                                rs.url_host,
                                COUNT(1) AS count
                            FROM resources AS rs
                            WHERE {" AND ".join(sch_sub_query)}
                            GROUP BY rs.url_host
                            ORDER BY count DESC
                            LIMIT 1
                        ) AS first
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
    return helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                              end_time=endTimestamp,
                                                              density=density,
                                                              neutral={"first_party": 0,
                                                                       "third_party": 0}))


def get_application_activity_avg_page_load_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                                endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        row = __get_application_activity_avg_page_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        results["chart"] = get_performance_avg_page_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_application_activity_avg_page_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        previous = helper.dict_to_camel_case(row)
        results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_application_activity_avg_page_load_time(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("pages.load_event_end>0")
    ch_query = f"""SELECT COALESCE(avgOrNull(pages.load_event_end),0) AS value
                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    row = ch.execute(query=ch_query, params=params)[0]
    result = row
    for k in result:
        if result[k] is None:
            result[k] = 0
    return result


def get_performance_avg_page_load_time(ch, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(),
                                       density=19, resources=None, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    location_constraints = []
    meta_condition = __get_meta_constraint(args)

    location_constraints_vals = {}

    if resources and len(resources) > 0:
        for r in resources:
            if r["type"] == "LOCATION":
                location_constraints.append(f"pages.url_path = %(val_{len(location_constraints)})s")
                location_constraints_vals["val_" + str(len(location_constraints) - 1)] = r['value']

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}

    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True,
                                                 data=args)
    ch_sub_query_chart += meta_condition
    ch_sub_query_chart.append("pages.load_event_end>0")

    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                          COALESCE(avgOrNull(pages.load_event_end),0) AS value 
                  FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                  WHERE {" AND ".join(ch_sub_query_chart)} 
                      {(f' AND ({" OR ".join(location_constraints)})') if len(location_constraints) > 0 else ""}
                  GROUP BY timestamp
                  ORDER BY timestamp;"""

    rows = ch.execute(query=ch_query, params={**params, **location_constraints_vals, **__get_constraint_values(args)})
    pages = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                     end_time=endTimestamp,
                                     density=density, neutral={"value": 0})

    # for s in pages:
    #     for k in s:
    #         if s[k] is None:
    #             s[k] = 0
    return pages


def get_application_activity_avg_image_load_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                                 endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        row = __get_application_activity_avg_image_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        results["chart"] = get_performance_avg_image_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_application_activity_avg_image_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        previous = helper.dict_to_camel_case(row)
        results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_application_activity_avg_image_load_time(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("resources.type= %(type)s")
    ch_sub_query.append("resources.duration>0")
    ch_query = f"""\
                SELECT COALESCE(avgOrNull(resources.duration),0) AS value 
                FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                WHERE {" AND ".join(ch_sub_query)};"""
    row = ch.execute(query=ch_query,
                     params={"project_id": project_id, "type": 'img', "startTimestamp": startTimestamp,
                             "endTimestamp": endTimestamp, **__get_constraint_values(args)})[0]
    result = row
    # for k in result:
    #     if result[k] is None:
    #         result[k] = 0
    return result


def get_performance_avg_image_load_time(ch, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(),
                                        density=19, resources=None, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    img_constraints = []
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    img_constraints_vals = {}

    if resources and len(resources) > 0:
        for r in resources:
            if r["type"] == "IMG":
                img_constraints.append(f"resources.url = %(val_{len(img_constraints)})s")
                img_constraints_vals["val_" + str(len(img_constraints) - 1)] = r['value']

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    ch_sub_query_chart.append("resources.duration>0")
    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                          COALESCE(avgOrNull(resources.duration),0) AS value 
                  FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                  WHERE {" AND ".join(ch_sub_query_chart)}
                      AND resources.type = 'img' 
                      {(f' AND ({" OR ".join(img_constraints)})') if len(img_constraints) > 0 else ""}
                  GROUP BY timestamp
                  ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query, params={**params, **img_constraints_vals, **__get_constraint_values(args)})
    images = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                      end_time=endTimestamp,
                                      density=density, neutral={"value": 0})

    # for s in images:
    #     for k in s:
    #         if s[k] is None:
    #             s[k] = 0
    return images


def get_application_activity_avg_request_load_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                                   endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        row = __get_application_activity_avg_request_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        results["chart"] = get_performance_avg_request_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_application_activity_avg_request_load_time(ch, project_id, startTimestamp, endTimestamp, **args)
        previous = helper.dict_to_camel_case(row)
        results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_application_activity_avg_request_load_time(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="resources", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("resources.type= %(type)s")
    ch_sub_query.append("resources.duration>0")
    ch_query = f"""SELECT COALESCE(avgOrNull(resources.duration),0) AS value 
                    FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    row = ch.execute(query=ch_query,
                     params={"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp,
                             "endTimestamp": endTimestamp, **__get_constraint_values(args)})[0]
    result = row
    # for k in result:
    #     if result[k] is None:
    #         result[k] = 0
    return result


def get_performance_avg_request_load_time(ch, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                          endTimestamp=TimeUTC.now(),
                                          density=19, resources=None, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    request_constraints = []
    ch_sub_query_chart = __get_basic_constraints(table_name="resources", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    request_constraints_vals = {}

    if resources and len(resources) > 0:
        for r in resources:
            if r["type"] != "IMG" and r["type"] == "LOCATION":
                request_constraints.append(f"resources.url = %(val_{len(request_constraints)})s")
                request_constraints_vals["val_" + str(len(request_constraints) - 1)] = r['value']
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    ch_sub_query_chart.append("resources.duration>0")
    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(resources.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                          COALESCE(avgOrNull(resources.duration),0) AS value 
                  FROM resources {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                  WHERE {" AND ".join(ch_sub_query_chart)} 
                      AND resources.type = 'fetch'  
                      {(f' AND ({" OR ".join(request_constraints)})') if len(request_constraints) > 0 else ""}
                  GROUP BY timestamp
                  ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query,
                      params={**params, **request_constraints_vals, **__get_constraint_values(args)})
    requests = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                        end_time=endTimestamp, density=density,
                                        neutral={"value": 0})

    # for s in requests:
    #     for k in s:
    #         if s[k] is None:
    #             s[k] = 0
    return requests


def get_page_metrics_avg_dom_content_load_start(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                                endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        results = {}
        rows = __get_page_metrics_avg_dom_content_load_start(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
        results["chart"] = __get_page_metrics_avg_dom_content_load_start_chart(ch, project_id, startTimestamp,
                                                                               endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_page_metrics_avg_dom_content_load_start(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_page_metrics_avg_dom_content_load_start(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("pages.dom_content_loaded_event_end>0")
    ch_query = f"""SELECT COALESCE(avgOrNull(pages.dom_content_loaded_event_end),0) AS value
                    FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    rows = ch.execute(query=ch_query, params=params)
    return rows


def __get_page_metrics_avg_dom_content_load_start_chart(ch, project_id, startTimestamp, endTimestamp, density=19,
                                                        **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    ch_sub_query_chart.append("pages.dom_content_loaded_event_end>0")
    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                        COALESCE(avgOrNull(pages.dom_content_loaded_event_end),0) AS value 
                      FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query, params={**params, **__get_constraint_values(args)})
    rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density, neutral={"value": 0})

    # for s in rows:
    #     for k in s:
    #         if s[k] is None:
    #             s[k] = 0
    return rows


def get_page_metrics_avg_first_contentful_pixel(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                                endTimestamp=TimeUTC.now(), **args):
    with ch_client.ClickHouseClient() as ch:
        rows = __get_page_metrics_avg_first_contentful_pixel(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
        results["chart"] = __get_page_metrics_avg_first_contentful_pixel_chart(ch, project_id, startTimestamp,
                                                                               endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_page_metrics_avg_first_contentful_pixel(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_page_metrics_avg_first_contentful_pixel(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("pages.first_contentful_paint>0")
    # changed dom_content_loaded_event_start to dom_content_loaded_event_end
    ch_query = f"""\
        SELECT COALESCE(avgOrNull(pages.first_contentful_paint),0)  AS value
        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
        WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    rows = ch.execute(query=ch_query, params=params)
    return rows


def __get_page_metrics_avg_first_contentful_pixel_chart(ch, project_id, startTimestamp, endTimestamp, density=20,
                                                        **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    ch_sub_query_chart.append("pages.first_contentful_paint>0")
    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                          COALESCE(avgOrNull(pages.first_contentful_paint),0) AS value 
                  FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                  WHERE {" AND ".join(ch_sub_query_chart)}
                  GROUP BY timestamp
                  ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query, params={**params, **__get_constraint_values(args)})
    rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density, neutral={"value": 0})
    return rows


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
    results["unit"] = schemas.TemplatePredefinedUnits.count
    return results


def __get_user_activity_avg_visited_pages(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition

    ch_query = f"""SELECT COALESCE(CEIL(avgOrNull(count)),0) AS value
                    FROM (SELECT COUNT(1) AS count 
                            FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY session_id) AS groupped_data
                    WHERE count>0;"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    rows = ch.execute(query=ch_query, params=params)

    return rows


def __get_user_activity_avg_visited_pages_chart(ch, project_id, startTimestamp, endTimestamp, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp, **__get_constraint_values(args)}
    ch_query = f"""SELECT timestamp, COALESCE(avgOrNull(count), 0) AS value
                    FROM (SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                            session_id, COUNT(1) AS count 
                          FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                          WHERE {" AND ".join(ch_sub_query_chart)}
                          GROUP BY timestamp,session_id
                          ORDER BY timestamp) AS groupped_data
                    WHERE count>0
                    GROUP BY timestamp
                    ORDER BY timestamp;"""
    rows = ch.execute(query=ch_query, params=params)
    rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density, neutral={"value": 0})
    return rows


def get_user_activity_avg_session_duration(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                           endTimestamp=TimeUTC.now(), **args):
    results = {}

    with ch_client.ClickHouseClient() as ch:
        rows = __get_user_activity_avg_session_duration(ch, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
            for key in results:
                if isnan(results[key]):
                    results[key] = 0
        results["chart"] = __get_user_activity_avg_session_duration_chart(ch, project_id, startTimestamp,
                                                                          endTimestamp, **args)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_user_activity_avg_session_duration(ch, project_id, startTimestamp, endTimestamp, **args)

        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    helper.__time_value(results)
    return results


def __get_user_activity_avg_session_duration(ch, project_id, startTimestamp, endTimestamp, **args):
    ch_sub_query = __get_basic_constraints(table_name="sessions", data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query += meta_condition
    ch_sub_query.append("isNotNull(sessions.duration)")
    ch_sub_query.append("sessions.duration>0")

    ch_query = f"""SELECT COALESCE(avgOrNull(sessions.duration),0) AS value
                    FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                    WHERE {" AND ".join(ch_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    rows = ch.execute(query=ch_query, params=params)

    return rows


def __get_user_activity_avg_session_duration_chart(ch, project_id, startTimestamp, endTimestamp, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="sessions", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition
    ch_sub_query_chart.append("isNotNull(sessions.duration)")
    ch_sub_query_chart.append("sessions.duration>0")
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}

    ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                                  COALESCE(avgOrNull(sessions.duration),0) AS value 
                      FROM sessions {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""

    rows = ch.execute(query=ch_query, params={**params, **__get_constraint_values(args)})
    rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                    end_time=endTimestamp,
                                    density=density, neutral={"value": 0})
    return rows


def get_top_metrics_avg_response_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                      endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.response_time),0) AS value
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)} AND isNotNull(pages.response_time) AND pages.response_time>0;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = rows[0]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COALESCE(avgOrNull(pages.response_time),0) AS value 
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                       WHERE {" AND ".join(ch_sub_query_chart)} AND isNotNull(pages.response_time) AND pages.response_time>0
                       GROUP BY timestamp
                       ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params={**params, **__get_constraint_values(args)})
        rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                        end_time=endTimestamp,
                                        density=density, neutral={"value": 0})
        results["chart"] = rows
    helper.__time_value(results)
    return helper.dict_to_camel_case(results)


def get_top_metrics_count_requests(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                   endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition
    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COUNT(1) AS value
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)};"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        result = rows[0]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second ))*1000 AS timestamp,
                              COUNT(1) AS value 
                      FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                      WHERE {" AND ".join(ch_sub_query_chart)}
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params={**params, **__get_constraint_values(args)})
        rows = __complete_missing_steps(rows=rows, start_time=startTimestamp,
                                        end_time=endTimestamp,
                                        density=density, neutral={"value": 0})
        result["chart"] = rows
    result["unit"] = schemas.TemplatePredefinedUnits.count
    return helper.dict_to_camel_case(result)


def get_top_metrics_avg_first_paint(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                    endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.first_paint),0) AS value
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)} AND isNotNull(pages.first_paint) AND pages.first_paint>0;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = rows[0]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                          COALESCE(avgOrNull(pages.first_paint),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)} AND isNotNull(pages.first_paint) AND pages.first_paint>0
                        GROUP BY timestamp
                        ORDER BY timestamp;;"""
        rows = ch.execute(query=ch_query, params=params)
        results["chart"] = helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                              end_time=endTimestamp,
                                                                              density=density,
                                                                              neutral={"value": 0}))

    helper.__time_value(results)
    return helper.dict_to_camel_case(results)


def get_top_metrics_avg_dom_content_loaded(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                           endTimestamp=TimeUTC.now(), value=None, density=19, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    ch_sub_query.append("isNotNull(pages.dom_content_loaded_event_time)")
    ch_sub_query.append("pages.dom_content_loaded_event_time>0")
    ch_sub_query_chart.append("isNotNull(pages.dom_content_loaded_event_time)")
    ch_sub_query_chart.append("pages.dom_content_loaded_event_time>0")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.dom_content_loaded_event_time),0) AS value 
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)};"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = helper.dict_to_camel_case(rows[0])
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                              COALESCE(avgOrNull(pages.dom_content_loaded_event_time),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params=params)
        results["chart"] = helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                              end_time=endTimestamp,
                                                                              density=density,
                                                                              neutral={"value": 0}))
    helper.__time_value(results)
    return results


def get_top_metrics_avg_till_first_bit(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    ch_sub_query.append("isNotNull(pages.ttfb)")
    ch_sub_query.append("pages.ttfb>0")
    ch_sub_query_chart.append("isNotNull(pages.ttfb)")
    ch_sub_query_chart.append("pages.ttfb>0")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.ttfb),0) AS value 
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)};"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = rows[0]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                          COALESCE(avgOrNull(pages.ttfb),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params=params)
        results["chart"] = helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                              end_time=endTimestamp,
                                                                              density=density,
                                                                              neutral={"value": 0}))
    helper.__time_value(results)
    return helper.dict_to_camel_case(results)


def get_top_metrics_avg_time_to_interactive(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                            endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density)
    ch_sub_query_chart = __get_basic_constraints(table_name="pages", round_start=True, data=args)
    meta_condition = __get_meta_constraint(args)
    ch_sub_query_chart += meta_condition

    ch_sub_query = __get_basic_constraints(table_name="pages", data=args)
    ch_sub_query += meta_condition

    if value is not None:
        ch_sub_query.append("pages.url_path = %(value)s")
        ch_sub_query_chart.append("pages.url_path = %(value)s")
    ch_sub_query.append("isNotNull(pages.time_to_interactive)")
    ch_sub_query.append("pages.time_to_interactive >0")
    ch_sub_query_chart.append("isNotNull(pages.time_to_interactive)")
    ch_sub_query_chart.append("pages.time_to_interactive >0")
    with ch_client.ClickHouseClient() as ch:
        ch_query = f"""SELECT COALESCE(avgOrNull(pages.time_to_interactive),0) AS value 
                       FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""} 
                       WHERE {" AND ".join(ch_sub_query)};"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": value, **__get_constraint_values(args)}
        rows = ch.execute(query=ch_query, params=params)
        results = rows[0]
        ch_query = f"""SELECT toUnixTimestamp(toStartOfInterval(pages.datetime, INTERVAL %(step_size)s second)) * 1000  AS timestamp,
                          COALESCE(avgOrNull(pages.time_to_interactive),0) AS value
                        FROM pages {"INNER JOIN sessions_metadata USING(session_id)" if len(meta_condition) > 0 else ""}
                        WHERE {" AND ".join(ch_sub_query_chart)}
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        rows = ch.execute(query=ch_query, params=params)
        results["chart"] = helper.list_to_camel_case(__complete_missing_steps(rows=rows, start_time=startTimestamp,
                                                                              end_time=endTimestamp,
                                                                              density=density,
                                                                              neutral={"value": 0}))
    helper.__time_value(results)
    return helper.dict_to_camel_case(results)
