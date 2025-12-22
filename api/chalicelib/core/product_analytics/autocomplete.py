from typing import Optional

from cachetools import TTLCache, cached

from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient

cache = TTLCache(maxsize=1000, ttl=180)


@cached(cache)
def search_events(project_id: int, q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        full_args = {
            "project_id": project_id,
            "limit": 20,
            "q": helper.string_to_sql_like(q)
        }

        constraints = ["project_id = %(project_id)s"]
        if q:
            constraints += ["value ILIKE %(q)s"]

        query = ch_client.format(
            f"""\
            SELECT value,
                   truncate(row_count * 100 / SUM(row_count) OVER (), 2) AS row_percentage
            FROM (SELECT value,
                         sumMerge(data_count) OVER () AS row_count
                  FROM product_analytics.autocomplete_events_grouped
                  WHERE {" AND ".join(constraints)}
                  ORDER BY row_count DESC
                  LIMIT %(limit)s) AS raw""",
            parameters=full_args,
        )
        rows = ch_client.execute(query)

        return helper.list_to_camel_case(rows)


def search_events_properties(project_id: int, property_name: Optional[str] = None,
                             event_name: Optional[str] = None, q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        full_args = {
            "project_id": project_id,
            "limit": 20,
            "event_name": event_name,
            "property_name": property_name,
            "q_l": helper.string_to_sql_like(q),
        }

        constraints = [
            "project_id = %(project_id)s",
            "property_name = %(property_name)s",
        ]
        if event_name:
            constraints += ["event_name = %(event_name)s"]

        if q:
            constraints += ["value ILIKE %(q_l)s"]

        query = ch_client.format(
            f"""\
            SELECT value,
                   truncate(row_count * 100 / sum(row_count) OVER (), 2) AS row_percentage
            FROM (SELECT value,
                         sumMerge(data_count) AS row_count
                  FROM product_analytics.autocomplete_event_properties_grouped
                  WHERE {" AND ".join(constraints)}
                  GROUP BY 1
                  ORDER BY row_count DESC
                  LIMIT 20) AS raw
""",
            parameters=full_args,
        )

        rows = ch_client.execute(query)

    return helper.list_to_camel_case(rows)

def search_users_properties(project_id: int, property_name: Optional[str] = None,
                             user_id: Optional[str] = None, q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        full_args = {
            "project_id": project_id,
            "limit": 20,
            "user_id": user_id,
            "property_name": property_name,
            "q_l": helper.string_to_sql_like(q),
        }

        constraints = [
            "project_id = %(project_id)s",
            "property_name = %(property_name)s",
        ]
        if user_id:
            constraints += ["user_id = %(user_id)s"]

        if q:
            constraints += ["value ILIKE %(q_l)s"]

        query = ch_client.format(
            f"""\
            SELECT value,
                   truncate(row_count * 100 / sum(row_count) OVER (), 2) AS row_percentage
            FROM (SELECT value,
                         sumMerge(data_count) AS row_count
                  FROM product_analytics.autocomplete_user_properties_grouped
                  WHERE {" AND ".join(constraints)}
                  GROUP BY 1
                  ORDER BY row_count DESC
                  LIMIT 20) AS raw
""",
            parameters=full_args,
        )

        rows = ch_client.execute(query)

    return helper.list_to_camel_case(rows)
