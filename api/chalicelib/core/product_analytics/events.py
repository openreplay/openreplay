import logging

import schemas
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.ch_client import ClickHouseClient
from chalicelib.utils.exp_ch_helper import get_sub_condition, get_col_cast

logger = logging.getLogger(__name__)
PREDEFINED_EVENTS = {
    "CLICK": "String",
    "INPUT": "String",
    "LOCATION": "String",
    "ERROR": "String",
    "PERFORMANCE": "String",
    "REQUEST": "String"
}


def get_events(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT DISTINCT
               ON(event_name,auto_captured)
                   COUNT (1) OVER () AS total,
                   event_name AS name, display_name, description,
                   auto_captured
               FROM product_analytics.all_events
               WHERE project_id=%(project_id)s
               ORDER BY auto_captured, display_name
                   LIMIT %(limit)s
               OFFSET %(offset)s;""",
            parameters={"project_id": project_id, "limit": page.limit, "offset": (page.page - 1) * page.limit})
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {"total": len(PREDEFINED_EVENTS), "list": [{
            "name": e,
            "displayName": "",
            "description": "",
            "autoCaptured": True,
            "id": "event_0",
            "dataType": "string",
            "possibleTypes": [
                "string"
            ],
            "_foundInPredefinedList": False
        } for e in PREDEFINED_EVENTS]}
    total = rows[0]["total"]
    rows = helper.list_to_camel_case(rows)
    for i, row in enumerate(rows):
        row["id"] = f"event_{i}"
        row["dataType"] = "string"
        row["possibleTypes"] = ["string"]
        row["_foundInPredefinedList"] = True
        row.pop("total")
    keys = [r["name"] for r in rows]
    for e in PREDEFINED_EVENTS:
        if e not in keys:
            total += 1
            rows.append({
                "name": e,
                "displayName": "",
                "description": "",
                "autoCaptured": True,
                "id": "event_0",
                "dataType": "string",
                "possibleTypes": [
                    "string"
                ],
                "_foundInPredefinedList": False
            })
    return {"total": total, "list": rows}


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
                        get_sub_condition(col_name=column, val_name=f_k, operator=f.operator),
                        values=f.value, value_key=f_k)
                constraints.append(condition)

            else:
                e_k = f"e_value{i}"
                full_args = {**full_args, e_k: f.name}
                condition = f"`$event_name` = %({e_k})s"
                sub_conditions = []
                for j, ef in enumerate(f.properties.filters):
                    p_k = f"e_{i}_p_{j}"
                    full_args = {**full_args, **sh.multi_values(ef.value, value_key=p_k, data_type=ef.data_type)}
                    cast = get_col_cast(data_type=ef.data_type, value=ef.value)
                    if ef.is_predefined:
                        sub_condition = get_sub_condition(col_name=f"accurateCastOrNull(`{ef.name}`,'{cast}')",
                                                          val_name=p_k, operator=ef.operator)
                    else:
                        sub_condition = get_sub_condition(col_name=f"accurateCastOrNull(properties.`{ef.name}`,{cast})",
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
            return {"total": 0, "rows": [], "_src": 2}
        total = rows[0]["total"]
        for r in rows:
            r.pop("total")
        return {"total": total, "rows": rows, "_src": 2}


def get_lexicon(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1) OVER () AS total, all_events.event_name AS name,
                      *
               FROM product_analytics.all_events
               WHERE project_id = %(project_id)s
               ORDER BY display_name
                   LIMIT %(limit)s
               OFFSET %(offset)s;""",
            parameters={"project_id": project_id, "limit": page.limit, "offset": (page.page - 1) * page.limit})
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {"total": 0, "list": []}
    total = rows[0]["total"]
    rows = helper.list_to_camel_case(rows)
    for i, row in enumerate(rows):
        row["id"] = f"event_{i}"
        row["dataType"] = "string"
        row["possibleTypes"] = ["string"]
        row["_foundInPredefinedList"] = True
        row.pop("total")
    return {"total": total, "list": rows}
