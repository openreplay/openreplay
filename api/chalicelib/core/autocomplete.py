import schemas
from chalicelib.core import countries, events, metadata
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.event_filter_definition import Event

TABLE = "public.autocomplete"


def __get_autocomplete_table(value, project_id):
    autocomplete_events = [schemas.FilterType.rev_id,
                           schemas.EventType.click,
                           schemas.FilterType.user_device,
                           schemas.FilterType.user_id,
                           schemas.FilterType.user_browser,
                           schemas.FilterType.user_os,
                           schemas.EventType.custom,
                           schemas.FilterType.user_country,
                           schemas.FilterType.user_city,
                           schemas.FilterType.user_state,
                           schemas.EventType.location,
                           schemas.EventType.input]
    autocomplete_events.sort()
    sub_queries = []
    c_list = []
    for e in autocomplete_events:
        if e == schemas.FilterType.user_country:
            c_list = countries.get_country_code_autocomplete(value)
            if len(c_list) > 0:
                sub_queries.append(f"""(SELECT DISTINCT ON(value) '{e.value}' AS _type, value
                                        FROM {TABLE}
                                        WHERE project_id = %(project_id)s
                                            AND type= '{e.value.upper()}' 
                                            AND value IN %(c_list)s)""")
            continue
        sub_queries.append(f"""(SELECT '{e.value}' AS _type, value
                                FROM {TABLE}
                                WHERE project_id = %(project_id)s
                                    AND type= '{e.value.upper()}' 
                                    AND value ILIKE %(svalue)s
                                ORDER BY value
                                LIMIT 5)""")
        if len(value) > 2:
            sub_queries.append(f"""(SELECT '{e.value}' AS _type, value
                                    FROM {TABLE}
                                    WHERE project_id = %(project_id)s
                                        AND type= '{e.value.upper()}' 
                                        AND value ILIKE %(value)s
                                    ORDER BY value
                                    LIMIT 5)""")
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(" UNION DISTINCT ".join(sub_queries) + ";",
                            {"project_id": project_id,
                             "value": helper.string_to_sql_like(value),
                             "svalue": helper.string_to_sql_like("^" + value),
                             "c_list": tuple(c_list)
                             })
        try:
            cur.execute(query)
        except Exception as err:
            print("--------- AUTOCOMPLETE SEARCH QUERY EXCEPTION -----------")
            print(query.decode('UTF-8'))
            print("--------- VALUE -----------")
            print(value)
            print("--------------------")
            raise err
        results = cur.fetchall()
    for r in results:
        r["type"] = r.pop("_type")
    results = helper.list_to_camel_case(results)
    return results


def __generic_query(typename, value_length=None):
    if typename == schemas.FilterType.user_country:
        return f"""SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value IN %(value)s
                      ORDER BY value"""

    if value_length is None or value_length > 2:
        return f"""(SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value ILIKE %(svalue)s
                      ORDER BY value
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value ILIKE %(value)s
                      ORDER BY value
                    LIMIT 5);"""
    return f"""SELECT DISTINCT value, type
                FROM {TABLE}
                WHERE
                  project_id = %(project_id)s
                  AND type='{typename.upper()}'
                  AND value ILIKE %(svalue)s
                  ORDER BY value
                LIMIT 10;"""


def __generic_autocomplete(event: Event):
    def f(project_id, value, key=None, source=None):
        with pg_client.PostgresClient() as cur:
            query = __generic_query(event.ui_type, value_length=len(value))
            params = {"project_id": project_id, "value": helper.string_to_sql_like(value),
                      "svalue": helper.string_to_sql_like("^" + value)}
            cur.execute(cur.mogrify(query, params))
            return helper.list_to_camel_case(cur.fetchall())

    return f


def __generic_autocomplete_metas(typename):
    def f(project_id, text):
        with pg_client.PostgresClient() as cur:
            params = {"project_id": project_id, "value": helper.string_to_sql_like(text),
                      "svalue": helper.string_to_sql_like("^" + text)}

            if typename == schemas.FilterType.user_country:
                params["value"] = tuple(countries.get_country_code_autocomplete(text))
                if len(params["value"]) == 0:
                    return []

            query = cur.mogrify(__generic_query(typename, value_length=len(text)), params)
            cur.execute(query)
            rows = cur.fetchall()
        return rows

    return f


def __errors_query(source=None, value_length=None):
    if value_length is None or value_length > 2:
        return f"""((SELECT DISTINCT ON(lg.message)
                        lg.message AS value,
                        source,
                        '{events.EventType.ERROR.ui_type}' AS type
                    FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.message ILIKE %(svalue)s
                      AND lg.project_id = %(project_id)s
                      {"AND source = %(source)s" if source is not None else ""}
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        source,
                        '{events.EventType.ERROR.ui_type}' AS type
                    FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.name ILIKE %(svalue)s
                      AND lg.project_id = %(project_id)s
                      {"AND source = %(source)s" if source is not None else ""}
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT ON(lg.message)
                        lg.message AS value,
                        source,
                        '{events.EventType.ERROR.ui_type}' AS type
                    FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.message ILIKE %(value)s
                      AND lg.project_id = %(project_id)s
                      {"AND source = %(source)s" if source is not None else ""}
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        source,
                        '{events.EventType.ERROR.ui_type}' AS type
                    FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.name ILIKE %(value)s
                      AND lg.project_id = %(project_id)s
                      {"AND source = %(source)s" if source is not None else ""}
                    LIMIT 5));"""
    return f"""((SELECT DISTINCT ON(lg.message)
                    lg.message AS value,
                    source,
                    '{events.EventType.ERROR.ui_type}' AS type
                FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                WHERE
                  s.project_id = %(project_id)s
                  AND lg.message ILIKE %(svalue)s
                  AND lg.project_id = %(project_id)s
                  {"AND source = %(source)s" if source is not None else ""}
                LIMIT 5)
                UNION DISTINCT
                (SELECT DISTINCT ON(lg.name)
                    lg.name AS value,
                    source,
                    '{events.EventType.ERROR.ui_type}' AS type
                FROM {events.EventType.ERROR.table} INNER JOIN public.errors AS lg USING (error_id) LEFT JOIN public.sessions AS s USING(session_id)
                WHERE
                  s.project_id = %(project_id)s
                  AND lg.name ILIKE %(svalue)s
                  AND lg.project_id = %(project_id)s
                  {"AND source = %(source)s" if source is not None else ""}
                LIMIT 5));"""


def __search_errors(project_id, value, key=None, source=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(__errors_query(source,
                                       value_length=len(value)),
                        {"project_id": project_id, "value": helper.string_to_sql_like(value),
                         "svalue": helper.string_to_sql_like("^" + value),
                         "source": source}))
        results = helper.list_to_camel_case(cur.fetchall())
    return results


def __search_errors_ios(project_id, value, key=None, source=None):
    if len(value) > 2:
        query = f"""(SELECT DISTINCT ON(lg.reason)
                        lg.reason AS value,
                        '{events.EventType.CRASH_IOS.ui_type}' AS type
                    FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.reason ILIKE %(svalue)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        '{events.EventType.CRASH_IOS.ui_type}' AS type
                    FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.name ILIKE %(svalue)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.reason)
                        lg.reason AS value,
                        '{events.EventType.CRASH_IOS.ui_type}' AS type
                    FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.reason ILIKE %(value)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        '{events.EventType.CRASH_IOS.ui_type}' AS type
                    FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.name ILIKE %(value)s
                    LIMIT 5);"""
    else:
        query = f"""(SELECT DISTINCT ON(lg.reason)
                            lg.reason AS value,
                            '{events.EventType.CRASH_IOS.ui_type}' AS type
                        FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                        WHERE
                          s.project_id = %(project_id)s
                          AND lg.project_id = %(project_id)s
                          AND lg.reason ILIKE %(svalue)s
                        LIMIT 5)
                        UNION ALL
                        (SELECT DISTINCT ON(lg.name)
                            lg.name AS value,
                            '{events.EventType.CRASH_IOS.ui_type}' AS type
                        FROM {events.EventType.CRASH_IOS.table} INNER JOIN public.crashes_ios AS lg USING (crash_id) LEFT JOIN public.sessions AS s USING(session_id)
                        WHERE
                          s.project_id = %(project_id)s
                          AND lg.project_id = %(project_id)s
                          AND lg.name ILIKE %(svalue)s
                        LIMIT 5);"""
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(query, {"project_id": project_id, "value": helper.string_to_sql_like(value),
                                        "svalue": helper.string_to_sql_like("^" + value)}))
        results = helper.list_to_camel_case(cur.fetchall())
    return results


def __search_metadata(project_id, value, key=None, source=None):
    meta_keys = metadata.get(project_id=project_id)
    meta_keys = {m["key"]: m["index"] for m in meta_keys}
    if len(meta_keys) == 0 or key is not None and key not in meta_keys.keys():
        return []
    sub_from = []
    if key is not None:
        meta_keys = {key: meta_keys[key]}

    for k in meta_keys.keys():
        colname = metadata.index_to_colname(meta_keys[k])
        if len(value) > 2:
            sub_from.append(f"""((SELECT DISTINCT ON ({colname}) {colname} AS value, '{k}' AS key 
                                FROM public.sessions 
                                WHERE project_id = %(project_id)s 
                                AND {colname} ILIKE %(svalue)s LIMIT 5)
                                UNION
                                (SELECT DISTINCT ON ({colname}) {colname} AS value, '{k}' AS key 
                                FROM public.sessions 
                                WHERE project_id = %(project_id)s 
                                AND {colname} ILIKE %(value)s LIMIT 5))
                                """)
        else:
            sub_from.append(f"""(SELECT DISTINCT ON ({colname}) {colname} AS value, '{k}' AS key 
                                FROM public.sessions 
                                WHERE project_id = %(project_id)s 
                                AND {colname} ILIKE %(svalue)s LIMIT 5)""")
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""\
                    SELECT key, value, 'METADATA' AS TYPE
                    FROM({" UNION ALL ".join(sub_from)}) AS all_metas
                    LIMIT 5;""", {"project_id": project_id, "value": helper.string_to_sql_like(value),
                                  "svalue": helper.string_to_sql_like("^" + value)}))
        results = helper.list_to_camel_case(cur.fetchall())
    return results
