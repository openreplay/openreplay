import logging
from typing import List

from psycopg2.extras import RealDictRow

import schemas
from chalicelib.utils import ch_client
from chalicelib.utils import exp_ch_helper
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh
from chalicelib.core import events

logger = logging.getLogger(__name__)


def get_simple_funnel(filter_d: schemas.CardSeriesFilterSchema, project: schemas.ProjectContext,
                      metric_format: schemas.MetricExtendedFormatType) -> List[RealDictRow]:
    stages: List[schemas.SessionSearchEventSchema2] = filter_d.events
    filters: List[schemas.SessionSearchFilterSchema] = filter_d.filters
    platform = project.platform
    constraints = ["e.project_id = %(project_id)s",
                   "e.created_at >= toDateTime(%(startTimestamp)s/1000)",
                   "e.created_at <= toDateTime(%(endTimestamp)s/1000)",
                   "e.`$event_name` IN %(eventTypes)s"]

    full_args = {"project_id": project.project_id, "startTimestamp": filter_d.startTimestamp,
                 "endTimestamp": filter_d.endTimestamp}

    MAIN_EVENTS_TABLE = exp_ch_helper.get_main_events_table(timestamp=filter_d.startTimestamp,
                                                            platform=platform)
    MAIN_SESSIONS_TABLE = exp_ch_helper.get_main_sessions_table(filter_d.startTimestamp)

    full_args["MAIN_EVENTS_TABLE"] = MAIN_EVENTS_TABLE
    full_args["MAIN_SESSIONS_TABLE"] = MAIN_SESSIONS_TABLE

    n_stages_query = []
    n_stages_query_not = []
    event_types = []
    values = {}
    has_filters = False
    if len(filters) > 0:
        meta_keys = None
        for i, f in enumerate(filters):
            if len(f.value) == 0:
                continue

            has_filters = True
            f.value = helper.values_for_operator(value=f.value, op=f.operator)

            op = sh.get_sql_operator(f.operator)

            filter_type = f.type
            f_k = f"f_value{i}"
            values = {**values,
                      **sh.multi_values(f.value, value_key=f_k)}
            is_not = False
            if sh.is_negation_operator(f.operator):
                is_not = True

            if filter_type == schemas.FilterType.USER_BROWSER:
                constraints.append(
                    sh.multi_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
            elif filter_type == schemas.FilterType.DURATION:
                if len(f.value) > 0 and f.value[0] is not None:
                    constraints.append(f's.duration >= %(minDuration)s')
                    values["minDuration"] = f.value[0]
                if len(f["value"]) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    constraints.append('s.duration <= %(maxDuration)s')
                    values["maxDuration"] = f.value[1]
            elif filter_type == schemas.FilterType.REFERRER:
                constraints.append(
                    sh.multi_conditions(f"s.base_referrer {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
            elif filter_type == events.EventType.METADATA.ui_type:
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project.project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                if f.source in meta_keys.keys():
                    constraints.append(
                        sh.multi_conditions(
                            f's.{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s', f.value,
                            is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.user_id {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ANONYMOUS_ID,
                                 schemas.FilterType.USER_ANONYMOUS_ID_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.user_anonymous_id {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE]:
                constraints.append(
                    sh.multi_conditions(f's.rev_id {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

    i = -1
    for s in stages:

        if s.operator is None:
            s.operator = schemas.SearchEventOperator.IS

        if not isinstance(s.value, list):
            s.value = [s.value]
        is_any = sh.isAny_opreator(s.operator)
        if not is_any and isinstance(s.value, list) and len(s.value) == 0:
            continue
        i += 1

        op = sh.get_sql_operator(s.operator)
        is_not = False
        if sh.is_negation_operator(s.operator):
            is_not = True
            op = sh.reverse_sql_operator(op)

        specific_condition = None
        e_k = f"e_value{i}"
        event_type = s.type
        next_event_type = exp_ch_helper.get_event_type(event_type, platform=platform)
        if event_type == events.EventType.CLICK.ui_type:
            if platform == "web":
                next_col_name = events.EventType.CLICK.column
                if not is_any:
                    if schemas.ClickEventExtraOperator.has_value(s.operator):
                        specific_condition = sh.multi_conditions(f"selector {op} %({e_k})s", s.value, value_key=e_k)
            else:
                next_col_name = events.EventType.CLICK_MOBILE.column
        elif event_type == events.EventType.INPUT.ui_type:
            next_col_name = events.EventType.INPUT.column
        elif event_type == events.EventType.LOCATION.ui_type:
            next_col_name = 'url_path'
        elif event_type == events.EventType.CUSTOM.ui_type:
            next_col_name = events.EventType.CUSTOM.column
        #     IOS --------------
        elif event_type == events.EventType.CLICK_MOBILE.ui_type:
            next_col_name = events.EventType.CLICK_MOBILE.column
        elif event_type == events.EventType.INPUT_MOBILE.ui_type:
            next_col_name = events.EventType.INPUT_MOBILE.column
        elif event_type == events.EventType.VIEW_MOBILE.ui_type:
            next_col_name = events.EventType.VIEW_MOBILE.column
        elif event_type == events.EventType.CUSTOM_MOBILE.ui_type:
            next_col_name = events.EventType.CUSTOM_MOBILE.column
        else:
            logger.warning(f"=================UNDEFINED:{event_type}")
            continue

        values = {**values, **sh.multi_values(helper.values_for_operator(value=s.value, op=s.operator), value_key=e_k)}

        if next_event_type not in event_types:
            event_types.append(next_event_type)
        full_args[f"event_type_{i}"] = next_event_type
        n_stages_query.append(f"`$event_name`=%(event_type_{i})s")
        if is_not:
            n_stages_query_not.append(n_stages_query[-1] + " AND " +
                                      (sh.multi_conditions(
                                          f"JSON_VALUE(CAST(`$properties` AS String), '$.{next_col_name}') {op} %({e_k})s",
                                          s.value,
                                          is_not=is_not,
                                          value_key=e_k
                                      ) if not specific_condition else specific_condition))
        elif not is_any:
            n_stages_query[-1] += " AND " + (
                sh.multi_conditions(
                    f"JSON_VALUE(CAST(`$properties` AS String), '$.{next_col_name}') {op} %({e_k})s",
                    s.value,
                    is_not=is_not,
                    value_key=e_k
                ) if not specific_condition else specific_condition)

    full_args = {"eventTypes": event_types, **full_args, **values}
    n_stages = len(n_stages_query)
    if n_stages == 0:
        return []

    extra_from = ""
    if has_filters or metric_format == schemas.MetricExtendedFormatType.USER_COUNT:
        extra_from = f"INNER JOIN {MAIN_SESSIONS_TABLE} AS s ON (e.session_id=s.session_id)"
        constraints += ["s.project_id = %(project_id)s",
                        "s.datetime >= toDateTime(%(startTimestamp)s/1000)",
                        "s.datetime <= toDateTime(%(endTimestamp)s/1000)"]

    if metric_format == schemas.MetricExtendedFormatType.SESSION_COUNT:
        group_by = 'e.session_id'
    else:
        constraints.append("isNotNull(s.user_id)")
        group_by = 's.user_id'

    if len(n_stages_query_not) > 0:
        value_conditions_not_base = ["project_id = %(project_id)s",
                                     "created_at >= toDateTime(%(startTimestamp)s/1000)",
                                     "created_at <= toDateTime(%(endTimestamp)s/1000)"]
        _value_conditions_not = []
        value_conditions_not = []
        for c in n_stages_query_not:
            _p = c % full_args
            if _p not in _value_conditions_not:
                _value_conditions_not.append(_p)
                value_conditions_not.append(c)

        extra_from += f"""LEFT ANTI JOIN (SELECT DISTINCT sub.session_id
                                          FROM {MAIN_EVENTS_TABLE} AS sub
                                          WHERE {' AND '.join(value_conditions_not_base)}
                                             AND ({' OR '.join([c for c in value_conditions_not])})
                                          ) AS sub ON(e.session_id=sub.session_id)"""
        del _value_conditions_not
        del value_conditions_not
        del value_conditions_not_base

    sequences = []
    projections = []
    for i, s in enumerate(n_stages_query):
        projections.append(f"coalesce(SUM(T{i + 1}),0) AS stage{i + 1}")
        if i == 0:
            sequences.append(f"anyIf(1,{s}) AS T1")
        else:
            pattern = ""
            conditions = []
            j = 0
            while j <= i:
                pattern += f"(?{j + 1})"
                conditions.append(n_stages_query[j])
                j += 1
            sequences.append(f"sequenceMatch('{pattern}')(toDateTime(e.created_at), {','.join(conditions)}) AS T{i + 1}")

    n_stages_query = f"""
         SELECT {",".join(projections)}
         FROM (SELECT {",".join(sequences)}
               FROM {MAIN_EVENTS_TABLE} AS e {extra_from}
               WHERE {" AND ".join(constraints)}
               GROUP BY {group_by}) AS raw;"""

    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=n_stages_query, parameters=full_args)
        logger.debug("---------------------------------------------------")
        logger.debug(query)
        logger.debug("---------------------------------------------------")
        try:
            row = cur.execute(query=query)
        except Exception as err:
            logger.warning("--------- SIMPLE FUNNEL SEARCH QUERY EXCEPTION CH-----------")
            logger.warning(query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(filter_d.model_dump_json())
            logger.warning("--------------------")
            raise err

    stages_list = []
    row = row[0]
    for i, stage in enumerate(stages):
        count = row[f"stage{i + 1}"]
        drop = None
        if i != 0:
            base_count = row[f"stage{i}"]
            if base_count == 0:
                drop = 0
            elif base_count > 0:
                drop = int(100 * (base_count - count) / base_count)

        stages_list.append(
            {"value": stage.value,
             "type": stage.type,
             "operator": stage.operator,
             "dropPct": drop,
             "count": count
             }
        )

    return stages_list
