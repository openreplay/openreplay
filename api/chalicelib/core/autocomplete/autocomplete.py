import logging
import schemas
from chalicelib.core import countries, events, metadata
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.event_filter_definition import Event
from chalicelib.utils.or_cache import CachedResponse

logger = logging.getLogger(__name__)
TABLE = "public.autocomplete"


def __get_autocomplete_table(value, project_id):
    autocomplete_events = [schemas.FilterType.REV_ID,
                           schemas.EventType.CLICK,
                           schemas.FilterType.USER_DEVICE,
                           schemas.FilterType.USER_ID,
                           schemas.FilterType.USER_BROWSER,
                           schemas.FilterType.USER_OS,
                           schemas.EventType.CUSTOM,
                           schemas.FilterType.USER_COUNTRY,
                           schemas.FilterType.USER_CITY,
                           schemas.FilterType.USER_STATE,
                           schemas.EventType.LOCATION,
                           schemas.EventType.INPUT]
    autocomplete_events.sort()
    sub_queries = []
    c_list = []
    for e in autocomplete_events:
        if e == schemas.FilterType.USER_COUNTRY:
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
            logger.exception("--------- AUTOCOMPLETE SEARCH QUERY EXCEPTION -----------")
            logger.exception(query.decode('UTF-8'))
            logger.exception("--------- VALUE -----------")
            logger.exception(value)
            logger.exception("--------------------")
            raise err
        results = cur.fetchall()
    for r in results:
        r["type"] = r.pop("_type")
    results = helper.list_to_camel_case(results)
    return results


def __generic_query(typename, value_length=None):
    if typename == schemas.FilterType.USER_COUNTRY:
        return f"""SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value IN %(value)s
                      ORDER BY value"""

    if value_length is None or value_length > 2:
        return f"""SELECT DISTINCT ON(value,type) value, type
                   ((SELECT DISTINCT value, type
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
                    LIMIT 5)) AS raw;"""
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


def generic_autocomplete_metas(typename):
    def f(project_id, text):
        with pg_client.PostgresClient() as cur:
            params = {"project_id": project_id, "value": helper.string_to_sql_like(text),
                      "svalue": helper.string_to_sql_like("^" + text)}

            if typename == schemas.FilterType.USER_COUNTRY:
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


def __search_errors_mobile(project_id, value, key=None, source=None):
    if len(value) > 2:
        query = f"""(SELECT DISTINCT ON(lg.reason)
                        lg.reason AS value,
                        '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                    FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.reason ILIKE %(svalue)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                    FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.name ILIKE %(svalue)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.reason)
                        lg.reason AS value,
                        '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                    FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.reason ILIKE %(value)s
                    LIMIT 5)
                    UNION ALL
                    (SELECT DISTINCT ON(lg.name)
                        lg.name AS value,
                        '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                    FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
                    WHERE
                      s.project_id = %(project_id)s
                      AND lg.project_id = %(project_id)s
                      AND lg.name ILIKE %(value)s
                    LIMIT 5);"""
    else:
        query = f"""(SELECT DISTINCT ON(lg.reason)
                            lg.reason AS value,
                            '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                        FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
                        WHERE
                          s.project_id = %(project_id)s
                          AND lg.project_id = %(project_id)s
                          AND lg.reason ILIKE %(svalue)s
                        LIMIT 5)
                        UNION ALL
                        (SELECT DISTINCT ON(lg.name)
                            lg.name AS value,
                            '{events.EventType.CRASH_MOBILE.ui_type}' AS type
                        FROM {events.EventType.CRASH_MOBILE.table} INNER JOIN public.crashes_ios AS lg USING (crash_ios_id) LEFT JOIN public.sessions AS s USING(session_id)
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
                    SELECT DISTINCT ON(key, value) key, value, 'METADATA' AS TYPE
                    FROM({" UNION ALL ".join(sub_from)}) AS all_metas
                    LIMIT 5;""", {"project_id": project_id, "value": helper.string_to_sql_like(value),
                                  "svalue": helper.string_to_sql_like("^" + value)}))
        results = helper.list_to_camel_case(cur.fetchall())
    return results


TYPE_TO_COLUMN = {
    schemas.EventType.CLICK: "label",
    schemas.EventType.INPUT: "label",
    schemas.EventType.LOCATION: "path",
    schemas.EventType.CUSTOM: "name",
    schemas.FetchFilterType.FETCH_URL: "path",
    schemas.GraphqlFilterType.GRAPHQL_NAME: "name",
    schemas.EventType.STATE_ACTION: "name",
    # For ERROR, sessions search is happening over name OR message,
    # for simplicity top 10 is using name only
    schemas.EventType.ERROR: "name",
    schemas.FilterType.USER_COUNTRY: "user_country",
    schemas.FilterType.USER_CITY: "user_city",
    schemas.FilterType.USER_STATE: "user_state",
    schemas.FilterType.USER_ID: "user_id",
    schemas.FilterType.USER_ANONYMOUS_ID: "user_anonymous_id",
    schemas.FilterType.USER_OS: "user_os",
    schemas.FilterType.USER_BROWSER: "user_browser",
    schemas.FilterType.USER_DEVICE: "user_device",
    schemas.FilterType.PLATFORM: "platform",
    schemas.FilterType.REV_ID: "rev_id",
    schemas.FilterType.REFERRER: "referrer",
    schemas.FilterType.UTM_SOURCE: "utm_source",
    schemas.FilterType.UTM_MEDIUM: "utm_medium",
    schemas.FilterType.UTM_CAMPAIGN: "utm_campaign",
}

TYPE_TO_TABLE = {
    schemas.EventType.CLICK: "events.clicks",
    schemas.EventType.INPUT: "events.inputs",
    schemas.EventType.LOCATION: "events.pages",
    schemas.EventType.CUSTOM: "events_common.customs",
    schemas.FetchFilterType.FETCH_URL: "events_common.requests",
    schemas.GraphqlFilterType.GRAPHQL_NAME: "events.graphql",
    schemas.EventType.STATE_ACTION: "events.state_actions",
}


def is_top_supported(event_type):
    return TYPE_TO_COLUMN.get(event_type, False) or event_type == schemas.FilterType.METADATA


@CachedResponse(table="or_cache.autocomplete_top_values", ttl=5 * 60)
def get_top_values(project_id, event_type, event_key=None):
    with pg_client.PostgresClient() as cur:
        if schemas.FilterType.has_value(event_type):
            if event_type == schemas.FilterType.METADATA \
                    and (event_key is None \
                         or (colname := metadata.get_colname_by_key(project_id=project_id, key=event_key)) is None) \
                    or event_type != schemas.FilterType.METADATA \
                    and (colname := TYPE_TO_COLUMN.get(event_type)) is None:
                return []

            query = f"""WITH raw AS (SELECT DISTINCT {colname} AS c_value,
                                                     COUNT(1) OVER (PARTITION BY {colname}) AS row_count,
                                                     COUNT(1) OVER () AS total_count
                                     FROM public.sessions
                                     WHERE project_id = %(project_id)s
                                       AND {colname} IS NOT NULL
                                       AND sessions.duration IS NOT NULL
                                       AND sessions.duration > 0
                                     ORDER BY row_count DESC
                                     LIMIT 10)
                        SELECT c_value AS value, row_count, trunc(row_count * 100 / total_count, 2) AS row_percentage
                        FROM raw;"""
        elif event_type == schemas.EventType.ERROR:
            colname = TYPE_TO_COLUMN.get(event_type)
            query = f"""WITH raw AS (SELECT DISTINCT {colname} AS c_value,
                                                                 COUNT(1) OVER (PARTITION BY {colname}) AS row_count,
                                                                 COUNT(1) OVER ()                   AS total_count
                                                 FROM public.errors
                                                 WHERE project_id = %(project_id)s
                                                   AND {colname} IS NOT NULL
                                                   AND {colname} != ''
                                                 ORDER BY row_count DESC
                                                 LIMIT 10)
                        SELECT c_value AS value, row_count, trunc(row_count * 100 / total_count,2) AS row_percentage
                        FROM raw;"""
        else:
            colname = TYPE_TO_COLUMN.get(event_type)
            table = TYPE_TO_TABLE.get(event_type)
            query = f"""WITH raw AS (SELECT DISTINCT {colname} AS c_value,
                                                     COUNT(1) OVER (PARTITION BY {colname}) AS row_count,
                                                     COUNT(1) OVER ()                   AS total_count
                                     FROM {table} INNER JOIN public.sessions USING(session_id)
                                     WHERE project_id = %(project_id)s
                                       AND {colname} IS NOT NULL
                                       AND {colname} != ''
                                       AND sessions.duration IS NOT NULL
                                       AND sessions.duration > 0
                                     ORDER BY row_count DESC
                                     LIMIT 10)
                        SELECT c_value AS value, row_count, trunc(row_count * 100 / total_count,2) AS row_percentage
                        FROM raw;"""
        params = {"project_id": project_id}
        query = cur.mogrify(query, params)
        logger.debug("--------------------")
        logger.debug(query)
        logger.debug("--------------------")
        cur.execute(query=query)
        results = cur.fetchall()
        return helper.list_to_camel_case(results)
