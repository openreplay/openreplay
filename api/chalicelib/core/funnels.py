import json
from typing import List

import schemas
from chalicelib.core import significance, sessions
from chalicelib.utils import helper, pg_client
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.TimeUTC import TimeUTC

REMOVE_KEYS = ["key", "_key", "startDate", "endDate"]

ALLOW_UPDATE_FOR = ["name", "filter"]


def filter_stages(stages: List[schemas._SessionSearchEventSchema]):
    ALLOW_TYPES = [schemas.EventType.click, schemas.EventType.input,
                   schemas.EventType.location, schemas.EventType.custom,
                   schemas.EventType.click_ios, schemas.EventType.input_ios,
                   schemas.EventType.view_ios, schemas.EventType.custom_ios, ]
    return [s for s in stages if s.type in ALLOW_TYPES and s.value is not None]


def __parse_events(f_events: List[dict]):
    return [schemas._SessionSearchEventSchema.parse_obj(e) for e in f_events]


def __unparse_events(f_events: List[schemas._SessionSearchEventSchema]):
    return [e.dict() for e in f_events]


def __fix_stages(f_events: List[schemas._SessionSearchEventSchema]):
    if f_events is None:
        return
    events = []
    for e in f_events:
        if e.operator is None:
            e.operator = schemas.SearchEventOperator._is

        if not isinstance(e.value, list):
            e.value = [e.value]
        is_any = sh.isAny_opreator(e.operator)
        if not is_any and isinstance(e.value, list) and len(e.value) == 0:
            continue
        events.append(e)
    return events


def __transform_old_funnels(events):
    for e in events:
        if not isinstance(e.get("value"), list):
            e["value"] = [e["value"]]
    return events


def get_possible_issue_types(project_id):
    return [{"type": t, "title": helper.get_issue_title(t)} for t in
            ['click_rage', 'dead_click', 'excessive_scrolling',
             'bad_request', 'missing_resource', 'memory', 'cpu',
             'slow_resource', 'slow_page_load', 'crash', 'custom_event_error',
             'js_error']]


def get_start_end_time(filter_d, range_value, start_date, end_date):
    if start_date is not None and end_date is not None:
        filter_d["startDate"], filter_d["endDate"] = start_date, end_date
    elif range_value is not None and len(range_value) > 0:
        filter_d["rangeValue"] = range_value
        filter_d["startDate"], filter_d["endDate"] = TimeUTC.get_start_end_from_range(range_value)
    else:
        filter_d["startDate"], filter_d["endDate"] = TimeUTC.get_start_end_from_range(filter_d["rangeValue"])


def get_sessions(project_id, funnel_id, user_id, range_value=None, start_date=None, end_date=None):
    f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
    if f is None:
        return {"errors": ["funnel not found"]}
    get_start_end_time(filter_d=f["filter"], range_value=range_value, start_date=start_date, end_date=end_date)
    return sessions.search_sessions(data=schemas.SessionsSearchPayloadSchema.parse_obj(f["filter"]),
                                    project_id=project_id,
                                    user_id=user_id)


def get_sessions_on_the_fly(funnel_id, project_id, user_id, data: schemas.FunnelSearchPayloadSchema):
    data.events = filter_stages(data.events)
    data.events = __fix_stages(data.events)
    if len(data.events) == 0:
        f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
        if f is None:
            return {"errors": ["funnel not found"]}
        get_start_end_time(filter_d=f["filter"], range_value=data.range_value,
                           start_date=data.startDate, end_date=data.endDate)
        data = schemas.FunnelSearchPayloadSchema.parse_obj(f["filter"])
    return sessions.search_sessions(data=data, project_id=project_id,
                                    user_id=user_id)


def get_top_insights(project_id, user_id, funnel_id, range_value=None, start_date=None, end_date=None):
    f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
    if f is None:
        return {"errors": ["funnel not found"]}
    get_start_end_time(filter_d=f["filter"], range_value=range_value, start_date=start_date, end_date=end_date)
    insights, total_drop_due_to_issues = significance.get_top_insights(filter_d=f["filter"], project_id=project_id)
    insights = helper.list_to_camel_case(insights)
    if len(insights) > 0:
        # fix: this fix for huge drop count
        if total_drop_due_to_issues > insights[0]["sessionsCount"]:
            total_drop_due_to_issues = insights[0]["sessionsCount"]
        # end fix
        insights[-1]["dropDueToIssues"] = total_drop_due_to_issues
    return {"data": {"stages": insights,
                     "totalDropDueToIssues": total_drop_due_to_issues}}


def get_top_insights_on_the_fly(funnel_id, user_id, project_id, data: schemas.FunnelInsightsPayloadSchema):
    data.events = filter_stages(__parse_events(data.events))
    if len(data.events) == 0:
        f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
        if f is None:
            return {"errors": ["funnel not found"]}
        get_start_end_time(filter_d=f["filter"], range_value=data.rangeValue,
                           start_date=data.startDate,
                           end_date=data.endDate)
        data = schemas.FunnelInsightsPayloadSchema.parse_obj(f["filter"])
    data.events = __fix_stages(data.events)
    insights, total_drop_due_to_issues = significance.get_top_insights(filter_d=data.dict(), project_id=project_id)
    insights = helper.list_to_camel_case(insights)
    if len(insights) > 0:
        # fix: this fix for huge drop count
        if total_drop_due_to_issues > insights[0]["sessionsCount"]:
            total_drop_due_to_issues = insights[0]["sessionsCount"]
        # end fix
        insights[-1]["dropDueToIssues"] = total_drop_due_to_issues
    return {"data": {"stages": insights,
                     "totalDropDueToIssues": total_drop_due_to_issues}}


# def get_top_insights_on_the_fly_widget(project_id, data: schemas.FunnelInsightsPayloadSchema):
def get_top_insights_on_the_fly_widget(project_id, data: schemas.CardSeriesFilterSchema):
    data.events = filter_stages(__parse_events(data.events))
    data.events = __fix_stages(data.events)
    if len(data.events) == 0:
        return {"stages": [], "totalDropDueToIssues": 0}
    insights, total_drop_due_to_issues = significance.get_top_insights(filter_d=data.dict(), project_id=project_id)
    insights = helper.list_to_camel_case(insights)
    if len(insights) > 0:
        # TODO: check if this correct
        if total_drop_due_to_issues > insights[0]["sessionsCount"]:
            if len(insights) == 0:
                total_drop_due_to_issues = 0
            else:
                total_drop_due_to_issues = insights[0]["sessionsCount"] - insights[-1]["sessionsCount"]
        insights[-1]["dropDueToIssues"] = total_drop_due_to_issues
    return {"stages": insights,
            "totalDropDueToIssues": total_drop_due_to_issues}


def get_issues(project_id, user_id, funnel_id, range_value=None, start_date=None, end_date=None):
    f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
    if f is None:
        return {"errors": ["funnel not found"]}
    get_start_end_time(filter_d=f["filter"], range_value=range_value, start_date=start_date, end_date=end_date)
    return {"data": {
        "issues": helper.dict_to_camel_case(significance.get_issues_list(filter_d=f["filter"], project_id=project_id))
    }}


def get_issues_on_the_fly(funnel_id, user_id, project_id, data: schemas.FunnelSearchPayloadSchema):
    data.events = filter_stages(data.events)
    data.events = __fix_stages(data.events)
    if len(data.events) == 0:
        f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
        if f is None:
            return {"errors": ["funnel not found"]}
        get_start_end_time(filter_d=f["filter"], range_value=data.rangeValue,
                           start_date=data.startDate,
                           end_date=data.endDate)
        data = schemas.FunnelSearchPayloadSchema.parse_obj(f["filter"])
    if len(data.events) < 2:
        return {"issues": []}
    return {
        "issues": helper.dict_to_camel_case(
            significance.get_issues_list(filter_d=data.dict(), project_id=project_id, first_stage=1,
                                         last_stage=len(data.events)))}


# def get_issues_on_the_fly_widget(project_id, data: schemas.FunnelSearchPayloadSchema):
def get_issues_on_the_fly_widget(project_id, data: schemas.CardSeriesFilterSchema):
    data.events = filter_stages(data.events)
    data.events = __fix_stages(data.events)
    if len(data.events) < 0:
        return {"issues": []}

    return {
        "issues": helper.dict_to_camel_case(
            significance.get_issues_list(filter_d=data.dict(), project_id=project_id, first_stage=1,
                                         last_stage=len(data.events)))}


def get(funnel_id, project_id, user_id, flatten=True, fix_stages=True):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                SELECT
                  *
                FROM public.funnels
                WHERE project_id = %(project_id)s
                  AND deleted_at IS NULL
                  AND funnel_id = %(funnel_id)s
                  AND (user_id = %(user_id)s OR is_public);""",
                {"funnel_id": funnel_id, "project_id": project_id, "user_id": user_id}
            )
        )

        f = helper.dict_to_camel_case(cur.fetchone())
    if f is None:
        return None
    if f.get("filter") is not None and f["filter"].get("events") is not None:
        f["filter"]["events"] = __transform_old_funnels(f["filter"]["events"])
    f["createdAt"] = TimeUTC.datetime_to_timestamp(f["createdAt"])
    f["filter"]["events"] = __parse_events(f["filter"]["events"])
    f["filter"]["events"] = filter_stages(stages=f["filter"]["events"])
    if fix_stages:
        f["filter"]["events"] = __fix_stages(f["filter"]["events"])
    f["filter"]["events"] = [e.dict() for e in f["filter"]["events"]]
    if flatten:
        f["filter"] = helper.old_search_payload_to_flat(f["filter"])
    return f
