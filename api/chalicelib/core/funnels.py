import json
from typing import List

import chalicelib.utils.helper
import schemas
from chalicelib.core import significance, sessions
from chalicelib.utils import dev
from chalicelib.utils import helper, pg_client
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
        is_any = sessions._isAny_opreator(e.operator)
        if not is_any and isinstance(e.value, list) and len(e.value) == 0:
            continue
        events.append(e)
    return events


def __transform_old_funnels(events):
    for e in events:
        if not isinstance(e.get("value"), list):
            e["value"] = [e["value"]]
    return events


def create(project_id, user_id, name, filter: schemas.FunnelSearchPayloadSchema, is_public):
    helper.delete_keys_from_dict(filter, REMOVE_KEYS)
    filter.events = filter_stages(stages=filter.events)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
            INSERT INTO public.funnels (project_id, user_id, name, filter,is_public) 
            VALUES (%(project_id)s, %(user_id)s, %(name)s, %(filter)s::jsonb,%(is_public)s)
            RETURNING *;""",
                            {"user_id": user_id, "project_id": project_id, "name": name,
                             "filter": json.dumps(filter.dict()),
                             "is_public": is_public})

        cur.execute(
            query
        )
        r = cur.fetchone()
        r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
        r = helper.dict_to_camel_case(r)
        r["filter"]["startDate"], r["filter"]["endDate"] = TimeUTC.get_start_end_from_range(r["filter"]["rangeValue"])
        return {"data": r}


def update(funnel_id, user_id, project_id, name=None, filter=None, is_public=None):
    s_query = []
    if filter is not None:
        helper.delete_keys_from_dict(filter, REMOVE_KEYS)
        s_query.append("filter = %(filter)s::jsonb")
    if name is not None and len(name) > 0:
        s_query.append("name = %(name)s")
    if is_public is not None:
        s_query.append("is_public = %(is_public)s")
    if len(s_query) == 0:
        return {"errors": ["Nothing to update"]}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
            UPDATE public.funnels 
            SET {" , ".join(s_query)}
            WHERE funnel_id=%(funnel_id)s
                AND project_id = %(project_id)s
                AND (user_id = %(user_id)s OR is_public)
            RETURNING *;""", {"user_id": user_id, "funnel_id": funnel_id, "name": name,
                              "filter": json.dumps(filter) if filter is not None else None, "is_public": is_public,
                              "project_id": project_id})
        # print("--------------------")
        # print(query)
        # print("--------------------")
        cur.execute(
            query
        )
        r = cur.fetchone()
        if r is None:
            return {"errors": ["funnel not found"]}
        r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
        r = helper.dict_to_camel_case(r)
        r["filter"]["startDate"], r["filter"]["endDate"] = TimeUTC.get_start_end_from_range(r["filter"]["rangeValue"])
        r["filter"] = helper.old_search_payload_to_flat(r["filter"])
        return {"data": r}


def get_by_user(project_id, user_id, range_value=None, start_date=None, end_date=None, details=False):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""\
                SELECT funnel_id, project_id, user_id, name, created_at, deleted_at, is_public
                    {",filter" if details else ""}
                FROM public.funnels
                WHERE project_id = %(project_id)s
                  AND funnels.deleted_at IS NULL
                  AND (funnels.user_id = %(user_id)s OR funnels.is_public);""",
                {"project_id": project_id, "user_id": user_id}
            )
        )

        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        for row in rows:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
            if details:
                row["filter"]["events"] = filter_stages(__parse_events(row["filter"]["events"]))
                if row.get("filter") is not None and row["filter"].get("events") is not None:
                    row["filter"]["events"] = __transform_old_funnels(__unparse_events(row["filter"]["events"]))

                get_start_end_time(filter_d=row["filter"], range_value=range_value, start_date=start_date,
                                   end_date=end_date)
                counts = sessions.search_sessions(data=schemas.SessionsSearchPayloadSchema.parse_obj(row["filter"]),
                                                  project_id=project_id, user_id=None, count_only=True)
                row["sessionsCount"] = counts["countSessions"]
                row["usersCount"] = counts["countUsers"]
                filter_clone = dict(row["filter"])
                overview = significance.get_overview(filter_d=row["filter"], project_id=project_id)
                row["stages"] = overview["stages"]
                row.pop("filter")
                row["stagesCount"] = len(row["stages"])
                # TODO: ask david to count it alone
                row["criticalIssuesCount"] = overview["criticalIssuesCount"]
                row["missedConversions"] = 0 if len(row["stages"]) < 2 \
                    else row["stages"][0]["sessionsCount"] - row["stages"][-1]["sessionsCount"]
                row["filter"] = helper.old_search_payload_to_flat(filter_clone)
    return rows


def get_possible_issue_types(project_id):
    return [{"type": t, "title": chalicelib.utils.helper.get_issue_title(t)} for t in
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


def delete(project_id, funnel_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.funnels 
            SET deleted_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND funnel_id = %(funnel_id)s
              AND (user_id = %(user_id)s OR is_public);""",
                        {"funnel_id": funnel_id, "project_id": project_id, "user_id": user_id})
        )

    return {"data": {"state": "success"}}


def get_sessions(project_id, funnel_id, user_id, range_value=None, start_date=None, end_date=None):
    f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
    if f is None:
        return {"errors": ["funnel not found"]}
    get_start_end_time(filter_d=f["filter"], range_value=range_value, start_date=start_date, end_date=end_date)
    return sessions.search_sessions(data=schemas.SessionsSearchPayloadSchema.parse_obj(f["filter"]), project_id=project_id,
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
def get_top_insights_on_the_fly_widget(project_id, data: schemas.CustomMetricSeriesFilterSchema):
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
def get_issues_on_the_fly_widget(project_id, data: schemas.CustomMetricSeriesFilterSchema):
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


def search_by_issue(user_id, project_id, funnel_id, issue_id, data: schemas.FunnelSearchPayloadSchema, range_value=None,
                    start_date=None, end_date=None):
    if len(data.events) == 0:
        f = get(funnel_id=funnel_id, project_id=project_id, user_id=user_id, flatten=False)
        if f is None:
            return {"errors": ["funnel not found"]}
        data.startDate = data.startDate if data.startDate is not None else start_date
        data.endDate = data.endDate if data.endDate is not None else end_date
        get_start_end_time(filter_d=f["filter"], range_value=range_value, start_date=data.startDate,
                           end_date=data.endDate)
        data = schemas.FunnelSearchPayloadSchema.parse_obj(f["filter"])

    issues = get_issues_on_the_fly(funnel_id=funnel_id, user_id=user_id, project_id=project_id, data=data) \
        .get("issues", {})
    issues = issues.get("significant", []) + issues.get("insignificant", [])
    issue = None
    for i in issues:
        if i.get("issueId", "") == issue_id:
            issue = i
            break
    return {"sessions": sessions.search_sessions(user_id=user_id, project_id=project_id, issue=issue,
                                                 data=data) if issue is not None else {"total": 0, "sessions": []},
            # "stages": helper.list_to_camel_case(insights),
            # "totalDropDueToIssues": total_drop_due_to_issues,
            "issue": issue}
