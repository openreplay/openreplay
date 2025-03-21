import logging

import schemas
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.ch_client import ClickHouseClient

logger = logging.getLogger(__name__)


def get_events(project_id: int):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT event_name, display_name
                      FROM product_analytics.all_events 
                      WHERE project_id=%(project_id)s
                      ORDER BY display_name;""",
            parameters={"project_id": project_id})
        x = ch_client.execute(r)

        return helper.list_to_camel_case(x)


def search_events(project_id: int, data: schemas.EventsSearchPayloadSchema):
    with ClickHouseClient() as ch_client:
        full_args = {"project_id": project_id, "startDate": data.startTimestamp, "endDate": data.endTimestamp,
                     "projectId": project_id, "limit": data.limit, "offset": (data.page - 1) * data.limit}

        constraints = ["project_id = %(projectId)s",
                       "created_at >= toDateTime(%(startDate)s/1000)",
                       "created_at <= toDateTime(%(endDate)s/1000)"]
        for i, f in enumerate(data.filters):
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, f_k: sh.single_value(f.value), **sh.multi_values(f.value, value_key=f_k)}
            op = sh.get_sql_operator(f.operator)
            is_any = sh.isAny_opreator(f.operator)
            is_undefined = sh.isUndefined_operator(f.operator)
            full_args = {**full_args, f_k: sh.single_value(f.value), **sh.multi_values(f.value, value_key=f_k)}
            if f.is_predefined:
                column = f.name
            else:
                column = f"properties.{f.name}"

            if is_any:
                condition = f"isNotNull({column})"
            elif is_undefined:
                condition = f"isNull({column})"
            else:
                condition = sh.multi_conditions(f"{column} {op} %({f_k})s", f.value, value_key=f_k)
            constraints.append(condition)

        ev_constraints = []
        for i, e in enumerate(data.events):
            e_k = f"e_value{i}"
            full_args = {**full_args, e_k: e.event_name}
            condition = f"`$event_name` = %({e_k})s"
            sub_conditions = []
            if len(e.properties.filters) > 0:
                for j, f in enumerate(e.properties.filters):
                    p_k = f"e_{i}_p_{j}"
                    full_args = {**full_args, **sh.multi_values(f.value, value_key=p_k)}
                    if f.is_predefined:
                        sub_condition = f"{f.name} {op} %({p_k})s"
                    else:
                        sub_condition = f"properties.{f.name} {op} %({p_k})s"
                    sub_conditions.append(sh.multi_conditions(sub_condition, f.value, value_key=p_k))
                if len(sub_conditions) > 0:
                    condition += " AND ("
                    for j, c in enumerate(sub_conditions):
                        if j > 0:
                            condition += " " + e.properties.operators[j - 1] + " " + c
                        else:
                            condition += c
                    condition += ")"

            ev_constraints.append(condition)

        constraints.append("(" + " OR ".join(ev_constraints) + ")")
        query = ch_client.format(
            f"""SELECT COUNT(1) OVER () AS total, 
                            event_id,
                           `$event_name`,
                           created_at,
                           `distinct_id`,
                           `$browser`,
                           `$import`,
                           `$os`,
                           `$country`,
                           `$state`,
                           `$city`,
                           `$screen_height`,
                           `$screen_width`,
                           `$source`,
                           `$user_id`,
                           `$device` 
                      FROM product_analytics.events 
                      WHERE {" AND ".join(constraints)} 
                      ORDER BY created_at
                      LIMIT %(limit)s OFFSET %(offset)s;""",
            parameters=full_args)
        rows = ch_client.execute(query)
        if len(rows) == 0:
            return {"total": 0, "rows": [], "src": 2}
        total = rows[0]["total"]
        for r in rows:
            r.pop("total")
        return {"total": total, "rows": rows, "src": 2}
