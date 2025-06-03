from typing import Optional

from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient


def search_events(project_id: int, q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        full_args = {"project_id": project_id, "limit": 20}

        constraints = ["project_id = %(project_id)s",
                       "_timestamp >= now()-INTERVAL 1 MONTH"]
        if q:
            constraints += ["value ILIKE %(q)s"]
            full_args["q"] = helper.string_to_sql_like(q)
        query = ch_client.format(
            f"""SELECT value,data_count
                      FROM product_analytics.autocomplete_events_grouped 
                      WHERE {" AND ".join(constraints)} 
                      ORDER BY data_count DESC 
                      LIMIT %(limit)s;""",
            parameters=full_args)
        rows = ch_client.execute(query)

        return {"values": helper.list_to_camel_case(rows), "_src": 2}


def search_properties(project_id: int, property_name: Optional[str] = None, event_name: Optional[str] = None,
                      q: Optional[str] = None):
    with ClickHouseClient() as ch_client:
        select = "value, data_count"
        grouping = ""
        full_args = {"project_id": project_id, "limit": 20,
                     "event_name": event_name, "property_name": property_name,
                     "q_l": helper.string_to_sql_like(q)}

        constraints = ["project_id = %(project_id)s",
                       "_timestamp >= now()-INTERVAL 1 MONTH",
                       "property_name = %(property_name)s"]
        if event_name:
            constraints += ["event_name = %(event_name)s"]
        else:
            select = "value, sum(aepg.data_count) AS data_count"
            grouping = "GROUP BY 1"

        if q:
            constraints += ["value ILIKE %(q_l)s"]

        query = ch_client.format(
            f"""SELECT {select}
                      FROM product_analytics.autocomplete_event_properties_grouped AS aepg 
                      WHERE {" AND ".join(constraints)}
                      {grouping} 
                      ORDER BY data_count DESC
                      LIMIT %(limit)s;""",
            parameters=full_args)
        rows = ch_client.execute(query)

        return {"events": helper.list_to_camel_case(rows), "_src": 2}
