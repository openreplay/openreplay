import schemas
from chalicelib.utils import ch_client
from chalicelib.utils import helper
from chalicelib.utils.event_filter_definition import Event

TABLE = "final.autocomplete"


def __get_autocomplete_table(value, project_id):
    autocomplete_events = [schemas.FilterType.rev_id,
                           schemas.EventType.click,
                           schemas.FilterType.user_device,
                           schemas.FilterType.user_id,
                           schemas.FilterType.user_browser,
                           schemas.FilterType.user_os,
                           schemas.EventType.custom,
                           schemas.FilterType.user_country,
                           schemas.EventType.location,
                           schemas.EventType.input]
    autocomplete_events.sort()
    sub_queries = []
    for e in autocomplete_events:
        sub_queries.append(f"""(SELECT type, value
                                FROM {TABLE}
                                WHERE project_id = %(project_id)s
                                    AND type= '{e}' 
                                    AND value ILIKE %(svalue)s
                                    ORDER BY value
                                LIMIT 5)""")
        if len(value) > 2:
            sub_queries.append(f"""(SELECT type, value
                                    FROM {TABLE}
                                    WHERE project_id = %(project_id)s
                                        AND type= '{e}' 
                                        AND value ILIKE %(value)s
                                        ORDER BY value
                                    LIMIT 5)""")
    with ch_client.ClickHouseClient() as cur:
        query = " UNION DISTINCT ".join(sub_queries) + ";"
        params = {"project_id": project_id, "value": helper.string_to_sql_like(value),
                  "svalue": helper.string_to_sql_like("^" + value)}
        results = []
        try:
            results = cur.execute(query=query, params=params)
        except Exception as err:
            print("--------- CH AUTOCOMPLETE SEARCH QUERY EXCEPTION -----------")
            print(cur.format(query=query, params=params))
            print("--------- PARAMS -----------")
            print(params)
            print("--------- VALUE -----------")
            print(value)
            print("--------------------")
            raise err
        return results


def __generic_query(typename, value_length=None):
    if value_length is None or value_length > 2:
        return f"""(SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename}'
                      AND value ILIKE %(svalue)s
                      ORDER BY value
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename}'
                      AND value ILIKE %(value)s
                      ORDER BY value
                    LIMIT 5);"""
    return f"""SELECT DISTINCT value, type
                FROM {TABLE}
                WHERE
                  project_id = %(project_id)s
                  AND type='{typename}'
                  AND value ILIKE %(svalue)s
                  ORDER BY value
                LIMIT 10;"""


def __generic_autocomplete(event: Event):
    def f(project_id, value, key=None, source=None):
        with ch_client.ClickHouseClient() as cur:
            query = __generic_query(event.ui_type, value_length=len(value))
            params = {"project_id": project_id, "value": helper.string_to_sql_like(value),
                      "svalue": helper.string_to_sql_like("^" + value)}
            results = cur.execute(query=query, params=params)
            return helper.list_to_camel_case(results)

    return f


def __generic_autocomplete_metas(typename):
    def f(project_id, text):
        with ch_client.ClickHouseClient() as cur:
            query = __generic_query(typename, value_length=len(text))
            params = {"project_id": project_id, "value": helper.string_to_sql_like(text),
                      "svalue": helper.string_to_sql_like("^" + text)}
            results = cur.execute(query=query, params=params)
        return results

    return f
