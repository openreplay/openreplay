from typing import List

import schemas
from chalicelib.core import significance
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh


def filter_stages(stages: List[schemas.SessionSearchEventSchema2]):
    ALLOW_TYPES = [schemas.EventType.CLICK, schemas.EventType.INPUT,
                   schemas.EventType.LOCATION, schemas.EventType.CUSTOM,
                   schemas.EventType.CLICK_MOBILE, schemas.EventType.INPUT_MOBILE,
                   schemas.EventType.VIEW_MOBILE, schemas.EventType.CUSTOM_MOBILE, ]
    return [s for s in stages if s.type in ALLOW_TYPES and s.value is not None]


def __parse_events(f_events: List[dict]):
    return [schemas.SessionSearchEventSchema2.parse_obj(e) for e in f_events]


def __fix_stages(f_events: List[schemas.SessionSearchEventSchema2]):
    if f_events is None:
        return
    events = []
    for e in f_events:
        if e.operator is None:
            e.operator = schemas.SearchEventOperator.IS

        if not isinstance(e.value, list):
            e.value = [e.value]
        is_any = sh.isAny_opreator(e.operator)
        if not is_any and isinstance(e.value, list) and len(e.value) == 0:
            continue
        events.append(e)
    return events


# def get_top_insights_on_the_fly_widget(project_id, data: schemas.FunnelInsightsPayloadSchema):
def get_top_insights_on_the_fly_widget(project_id, data: schemas.CardSeriesFilterSchema,
                                       metric_of: schemas.MetricOfFunnels):
    data.events = filter_stages(__parse_events(data.events))
    data.events = __fix_stages(data.events)
    if len(data.events) == 0:
        return {"stages": [], "totalDropDueToIssues": 0}
    insights, total_drop_due_to_issues = significance.get_top_insights(filter_d=data,
                                                                       project_id=project_id,
                                                                       metric_of=metric_of)
    insights = helper.list_to_camel_case(insights)
    if len(insights) > 0:
        if metric_of == schemas.MetricOfFunnels.SESSION_COUNT and total_drop_due_to_issues > (
                insights[0]["sessionsCount"] - insights[-1]["sessionsCount"]):
            total_drop_due_to_issues = insights[0]["sessionsCount"] - insights[-1]["sessionsCount"]
        elif metric_of == schemas.MetricOfFunnels.USER_COUNT and total_drop_due_to_issues > (
                insights[0]["usersCount"] - insights[-1]["usersCount"]):
            total_drop_due_to_issues = insights[0]["usersCount"] - insights[-1]["usersCount"]
        insights[-1]["dropDueToIssues"] = total_drop_due_to_issues
    return {"stages": insights,
            "totalDropDueToIssues": total_drop_due_to_issues}


# def get_issues_on_the_fly_widget(project_id, data: schemas.FunnelSearchPayloadSchema):
def get_issues_on_the_fly_widget(project_id, data: schemas.CardSeriesFilterSchema):
    data.events = filter_stages(data.events)
    data.events = __fix_stages(data.events)
    if len(data.events) < 0:
        return {"issues": []}

    return {
        "issues": helper.dict_to_camel_case(
            significance.get_issues_list(filter_d=data, project_id=project_id, first_stage=1,
                                         last_stage=len(data.events)))}
