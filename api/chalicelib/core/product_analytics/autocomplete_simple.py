from typing import Optional

from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient


def is_simple_property(name: str, source: str = "session") -> bool:
    supported = {
        "session": ["user_browser", "user_country", "user_state", "user_city", "user_device", "rev_id", "referrer",
                    "utm_source", "utm_medium", "utm_campaign", "user_id", "user_anonymous_id", "metadata_1",
                    "metadata_2", "metadata_3", "metadata_4", "metadata_5", "metadata_6", "metadata_7", "metadata_8",
                    "metadata_9", "metadata_10"]
    }

    return name in supported.get(source, [])


def search_simple_property(project_id: int, name: str, source: str = 'session', q: Optional[str] = None):
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
SELECT value, row_count, truncate(100 * row_count / sum(row_count) OVER (), 2) AS rowPercentage
FROM (SELECT value, count(1) AS row_count
      FROM product_analytics.autocomplete_simple
      WHERE {" AND ".join(constraints)} 
      GROUP BY 1) AS raw
ORDER BY row_count DESC
LIMIT %(limit)s;""",
            parameters=full_args,
        )
        rows = ch_client.execute(query)

    return helper.list_to_camel_case(rows)
