import logging
from typing import Union
import schemas
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.ch_client import ClickHouseClient
from schemas import SearchEventOperator

logger = logging.getLogger(__name__)


def get_events(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1) OVER () AS total,
                            event_name AS name, display_name, description,
                            auto_captured
                      FROM product_analytics.all_events 
                      WHERE project_id=%(project_id)s
                      ORDER BY auto_captured,display_name
                      LIMIT %(limit)s OFFSET %(offset)s;""",
            parameters={"project_id": project_id, "limit": page.limit, "offset": (page.page - 1) * page.limit})
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {"total": 0, "list": []}
    total = rows[0]["total"]
    for i, row in enumerate(rows):
        row["id"] = f"event_{i}"
        row["icon"] = None
        row["possibleTypes"] = ["string"]
        row.pop("total")
    return {"total": total, "list": helper.list_to_camel_case(rows)}


def __get_sub_condition(col_name: str, val_name: str,
                        operator: Union[schemas.SearchEventOperator, schemas.MathOperator]):
    if operator == SearchEventOperator.PATTERN:
        return f"match({col_name}, %({val_name})s)"
    op = sh.get_sql_operator(operator)
    return f"{col_name} {op} %({val_name})s"


def search_events(project_id: int, data: schemas.EventsSearchPayloadSchema):
    with ClickHouseClient() as ch_client:
        full_args = {"project_id": project_id, "startDate": data.startTimestamp, "endDate": data.endTimestamp,
                     "projectId": project_id, "limit": data.limit, "offset": (data.page - 1) * data.limit}

        constraints = ["project_id = %(projectId)s",
                       "created_at >= toDateTime(%(startDate)s/1000)",
                       "created_at <= toDateTime(%(endDate)s/1000)"]
        ev_constraints = []
        for i, f in enumerate(data.filters):
            if not f.is_event:
                f.value = helper.values_for_operator(value=f.value, op=f.operator)
                f_k = f"f_value{i}"
                full_args = {**full_args, f_k: sh.single_value(f.value), **sh.multi_values(f.value, value_key=f_k)}
                is_any = sh.isAny_opreator(f.operator)
                is_undefined = sh.isUndefined_operator(f.operator)
                full_args = {**full_args, f_k: sh.single_value(f.value), **sh.multi_values(f.value, value_key=f_k)}
                if f.is_predefined:
                    column = f.name
                else:
                    column = f"properties.{f.name}"

                if is_any:
                    condition = f"notEmpty{column})"
                elif is_undefined:
                    condition = f"empty({column})"
                else:
                    condition = sh.multi_conditions(
                        __get_sub_condition(col_name=column, val_name=f_k, operator=f.operator),
                        values=f.value, value_key=f_k)
                constraints.append(condition)

            else:
                e_k = f"e_value{i}"
                full_args = {**full_args, e_k: f.name}
                condition = f"`$event_name` = %({e_k})s"
                sub_conditions = []
                for j, ef in enumerate(f.properties.filters):
                    p_k = f"e_{i}_p_{j}"
                    full_args = {**full_args, **sh.multi_values(ef.value, value_key=p_k)}
                    if ef.is_predefined:
                        sub_condition = __get_sub_condition(col_name=ef.name, val_name=p_k, operator=ef.operator)
                    else:
                        sub_condition = __get_sub_condition(col_name=f"properties.{ef.name}",
                                                            val_name=p_k, operator=ef.operator)
                    sub_conditions.append(sh.multi_conditions(sub_condition, ef.value, value_key=p_k))
                if len(sub_conditions) > 0:
                    condition += " AND (" + (" " + f.properties.operator + " ").join(sub_conditions) + ")"

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


def get_lexicon(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1) OVER () AS total,
                            all_events.event_name AS name,
                            *
                      FROM product_analytics.all_events 
                      WHERE project_id=%(project_id)s
                      ORDER BY display_name
                      LIMIT %(limit)s OFFSET %(offset)s;""",
            parameters={"project_id": project_id, "limit": page.limit, "offset": (page.page - 1) * page.limit})
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {"total": 0, "list": []}
    total = rows[0]["total"]
    for i, row in enumerate(rows):
        row["id"] = f"event_{i}"
        row["icon"] = None
        row["possibleTypes"] = ["string"]
        row.pop("total")
    return {"total": total, "list": helper.list_to_camel_case(rows)}
