from typing import Optional

from cachetools import TTLCache, cached

from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient

cache = TTLCache(maxsize=1000, ttl=180)


@cached(cache)
def search_simple_property(project_id: int, name: str, source: str = 'sessions', q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        full_args = {
            "project_id": project_id,
            "limit": 20,
            "name": name,
            "source": source,
            "q_l": helper.string_to_sql_like(q)
        }

        constraints = [
            "project_id = %(project_id)s",
            "_timestamp >= now()-INTERVAL 1 MONTH",
            "name = %(name)s",
            "source = %(source)s",
        ]

        if q and len(q) > 0:
            constraints += ["value ILIKE %(q_l)s"]

        query = ch_client.format(
            f"""\
SELECT value, truncate(100 * row_count / sum(row_count) OVER (), 2) AS rowPercentage
FROM (SELECT value, sumMerge(data_count) AS row_count
      FROM product_analytics.autocomplete_simple
      WHERE {" AND ".join(constraints)} 
      GROUP BY 1) AS raw
ORDER BY row_count DESC
LIMIT %(limit)s;""",
            parameters=full_args,
        )
        rows = ch_client.execute(query)

    return helper.list_to_camel_case(rows)


EVENTS_SIMPLE_PROPERTIES = [
    'user_id',
    'sdk_edition',
    'sdk_version',
    'current_url',
    'current_path',
    'initial_referrer',
    'referring_domain',
    'country',
    'state',
    'city',
    'or_api_endpoint',
]

USERS_SIMPLE_PROPERTIES = [
    'user_id',
    'email',
    'name',
    'first_name',
    'last_name',
    'phone',
    'sdk_edition',
    'sdk_version',
    'current_url',
    'current_path',
    'initial_referrer',
    'referring_domain',
    'initial_utm_source',
    'initial_utm_medium',
    'initial_utm_campaign',
    'country',
    'state',
    'city',
    'or_api_endpoint',
]
