import logging

import schemas
from chalicelib.core import countries, metadata
from chalicelib.utils import ch_client
from chalicelib.utils import helper

logger = logging.getLogger(__name__)
TABLE = "experimental.autocomplete"


def __generic_query(typename, value_length=None):
    if typename == schemas.FilterType.USER_COUNTRY:
        return f"""SELECT DISTINCT value
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value IN %(value)s
                      ORDER BY value"""

    if value_length is None or value_length > 2:
        return f"""SELECT DISTINCT ON(value) value, '{typename.upper()}' AS type
                   FROM ((SELECT DISTINCT value
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value ILIKE %(svalue)s
                      ORDER BY value
                    LIMIT 5)
                    UNION DISTINCT
                    (SELECT DISTINCT value
                    FROM {TABLE}
                    WHERE
                      project_id = %(project_id)s
                      AND type='{typename.upper()}'
                      AND value ILIKE %(value)s
                      ORDER BY value
                    LIMIT 5)) AS raw;"""
    return f"""SELECT DISTINCT value
                FROM {TABLE}
                WHERE
                  project_id = %(project_id)s
                  AND type='{typename.upper()}'
                  AND value ILIKE %(svalue)s
                  ORDER BY value
                LIMIT 10;"""


def generic_autocomplete_metas(typename):
    def f(project_id, text):
        with ch_client.ClickHouseClient() as cur:
            params = {"project_id": project_id, "value": helper.string_to_sql_like(text),
                      "svalue": helper.string_to_sql_like("^" + text)}

            if typename == schemas.FilterType.USER_COUNTRY:
                params["value"] = tuple(countries.get_country_code_autocomplete(text))
                if len(params["value"]) == 0:
                    return []

            query = __generic_query(typename, value_length=len(text))
            rows = cur.execute(query=query, parameters=params)
        return rows

    return f


TYPE_TO_COLUMN = {
    schemas.EventType.CLICK: "`$properties`.label",
    schemas.EventType.INPUT: "`$properties`.label",
    schemas.EventType.LOCATION: "`$properties`.url_path",
    schemas.EventType.CUSTOM: "`$properties`.name",
    schemas.FetchFilterType.FETCH_URL: "`$properties`.url_path",
    schemas.GraphqlFilterType.GRAPHQL_NAME: "`$properties`.name",
    schemas.EventType.STATE_ACTION: "`$properties`.name",
    # For ERROR, sessions search is happening over name OR message,
    # for simplicity top 10 is using name only
    schemas.EventType.ERROR: "`$properties`.name",
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


def is_top_supported(event_type):
    return TYPE_TO_COLUMN.get(event_type, False)


def get_top_values(project_id, event_type, event_key=None):
    with ch_client.ClickHouseClient() as cur:
        if event_type.startswith("metadata_"):
            colname = event_type

        elif schemas.FilterType.has_value(event_type) and (colname := TYPE_TO_COLUMN.get(event_type)) is None:
            return []
        query = f"""WITH raw AS (SELECT DISTINCT {colname} AS c_value,
                                                 COUNT(1) OVER (PARTITION BY {colname}) AS row_count,
                                                 COUNT(1) OVER () AS total_count
                                 FROM experimental.sessions
                                 WHERE project_id = %(project_id)s
                                   AND isNotNull(toString(c_value))
                                   AND notEmpty(toString(c_value))
                                 ORDER BY row_count DESC
                                 LIMIT 10)
                    SELECT c_value AS value, row_count, truncate(row_count * 100 / total_count, 2) AS row_percentage
                    FROM raw;"""

        params = {"project_id": project_id}
        results = cur.execute(query=query, parameters=params)
        return helper.list_to_camel_case(results)
