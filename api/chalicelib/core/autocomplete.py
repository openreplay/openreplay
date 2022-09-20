import schemas
from chalicelib.core import countries
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
                           schemas.EventType.location,
                           schemas.EventType.input]
    autocomplete_events.sort()
    sub_queries = []
    c_list = []
    for e in autocomplete_events:
        if e == schemas.FilterType.user_country:
            c_list = countries.get_country_code_autocomplete(value)
            if len(c_list) > 0:
                sub_queries.append(f"""(SELECT DISTINCT ON(value) type, value
                                        FROM {TABLE}
                                        WHERE project_id = %(project_id)s
                                            AND type= '{e}' 
                                            AND value IN %(c_list)s)""")
            continue
        sub_queries.append(f"""(SELECT type, value
                                FROM {TABLE}
                                WHERE project_id = %(project_id)s
                                    AND type= '{e}' 
                                    AND value ILIKE %(svalue)s
                                LIMIT 5)""")
        if len(value) > 2:
            sub_queries.append(f"""(SELECT type, value
                                    FROM {TABLE}
                                    WHERE project_id = %(project_id)s
                                        AND type= '{e}' 
                                        AND value ILIKE %(value)s
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
        results = helper.list_to_camel_case(cur.fetchall())
        return results


def __generic_query(typename, value_length=None):
    if typename == schemas.FilterType.user_country:
        return f"""SELECT DISTINCT value, type
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename}'
                      AND value IN %(value)s
                      ORDER BY value"""

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

            query = cur.mogrify(__generic_query(typename, value_length=len(text)), params)
            cur.execute(query)
            rows = cur.fetchall()
        return rows

    return f
