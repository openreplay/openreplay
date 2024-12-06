import json
import logging

from decouple import config
from fastapi import HTTPException, status
from .custom_metrics import *
import schemas
from chalicelib.core import funnels, issues, heatmaps, sessions_mobs, sessions_favorite, \
    product_analytics, custom_metrics_predefined
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.storage import extra

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    logging.info(">>> Using experimental error search")
    from . import errors_exp as errors
else:
    from . import errors as errors

if config("EXP_SESSIONS_SEARCH_METRIC", cast=bool, default=False):
    from chalicelib.core import sessions
else:
    from chalicelib.core import sessions_legacy as sessions

logger = logging.getLogger(__name__)


# TODO: refactor this to split
#  timeseries /
#  table of errors / table of issues / table of browsers / table of devices / table of countries / table of URLs
# remove "table of" calls from this function
def __try_live(project_id, data: schemas.CardSchema):
    results = []
    for i, s in enumerate(data.series):
        results.append(sessions.search2_series(data=s.filter, project_id=project_id, density=data.density,
                                               view_type=data.view_type, metric_type=data.metric_type,
                                               metric_of=data.metric_of, metric_value=data.metric_value))

    return results


def __get_table_of_series(project_id, data: schemas.CardSchema):
    results = []
    for i, s in enumerate(data.series):
        results.append(sessions.search2_table(data=s.filter, project_id=project_id, density=data.density,
                                              metric_of=data.metric_of, metric_value=data.metric_value,
                                              metric_format=data.metric_format))

    return results


def __get_errors_list(project: schemas.ProjectContext, user_id, data: schemas.CardSchema):
    if len(data.series) == 0:
        return {
            "total": 0,
            "errors": []
        }
    return errors.search(data.series[0].filter, project_id=project.project_id, user_id=user_id)


def __get_sessions_list(project: schemas.ProjectContext, user_id, data: schemas.CardSchema):
    if len(data.series) == 0:
        logger.debug("empty series")
        return {
            "total": 0,
            "sessions": []
        }
    return sessions.search_sessions(data=data.series[0].filter, project_id=project.project_id, user_id=user_id)


def get_sessions_by_card_id(project_id, user_id, metric_id, data: schemas.CardSessionsSchema):
    # No need for this because UI is sending the full payload
    # card: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    # if card is None:
    #    return None
    # metric: schemas.CardSchema = schemas.CardSchema(**card)
    # metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    if not card_exists(metric_id=metric_id, project_id=project_id, user_id=user_id):
        return None
    results = []
    for s in data.series:
        results.append({"seriesId": s.series_id, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def get_sessions(project_id, user_id, data: schemas.CardSessionsSchema):
    results = []
    if len(data.series) == 0:
        return results
    for s in data.series:
        if len(data.filters) > 0:
            s.filter.filters += data.filters
            s.filter = schemas.SessionsSearchPayloadSchema(**s.filter.model_dump(by_alias=True))

        results.append({"seriesId": None, "seriesName": s.name,
                        **sessions.search_sessions(data=s.filter, project_id=project_id, user_id=user_id)})

    return results


def create_card(project: schemas.ProjectContext, user_id, data: schemas.CardSchema, dashboard=False):
    with pg_client.PostgresClient() as cur:
        session_data = None
        if data.metric_type == schemas.MetricType.HEAT_MAP:
            if data.session_id is not None:
                session_data = {"sessionId": data.session_id}
            else:
                session_data = __get_heat_map_chart(project=project, user_id=user_id,
                                                    data=data, include_mobs=False)
                if session_data is not None:
                    session_data = {"sessionId": session_data["sessionId"]}

            if session_data is not None:
                # for EE only
                keys = sessions_mobs. \
                    __get_mob_keys(project_id=project.project_id, session_id=session_data["sessionId"])
                keys += sessions_mobs. \
                    __get_mob_keys_deprecated(session_id=session_data["sessionId"])  # To support old sessions
                tag = config('RETENTION_L_VALUE', default='vault')
                for k in keys:
                    try:
                        extra.tag_session(file_key=k, tag_value=tag)
                    except Exception as e:
                        logger.warning(f"!!!Error while tagging: {k} to {tag} for heatMap")
                        logger.error(str(e))

        _data = {"session_data": json.dumps(session_data) if session_data is not None else None}
        for i, s in enumerate(data.series):
            for k in s.model_dump().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        params = {"user_id": user_id, "project_id": project.project_id, **data.model_dump(), **_data,
                  "default_config": json.dumps(data.default_config.model_dump()), "card_info": None}
        if data.metric_type == schemas.MetricType.PATH_ANALYSIS:
            params["card_info"] = json.dumps(__get_path_analysis_card_info(data=data))

        query = """INSERT INTO metrics (project_id, user_id, name, is_public,
                            view_type, metric_type, metric_of, metric_value,
                            metric_format, default_config, thumbnail, data,
                            card_info)
                   VALUES (%(project_id)s, %(user_id)s, %(name)s, %(is_public)s, 
                              %(view_type)s, %(metric_type)s, %(metric_of)s, %(metric_value)s, 
                              %(metric_format)s, %(default_config)s, %(thumbnail)s, %(session_data)s,
                              %(card_info)s)
                   RETURNING metric_id"""
        if len(data.series) > 0:
            query = f"""WITH m AS ({query})
                        INSERT INTO metric_series(metric_id, index, name, filter)
                        VALUES {",".join([f"((SELECT metric_id FROM m), %(index_{i})s, %(name_{i})s, %(filter_{i})s::jsonb)"
                                          for i in range(series_len)])}
                        RETURNING metric_id;"""

        query = cur.mogrify(query, params)
        cur.execute(query)
        r = cur.fetchone()
        if dashboard:
            return r["metric_id"]
    return {"data": get_card(metric_id=r["metric_id"], project_id=project.project_id, user_id=user_id)}


def delete_card(project_id, metric_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET deleted_at = timezone('utc'::text, now()), edited_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public)
            RETURNING data;""",
                        {"metric_id": metric_id, "project_id": project_id, "user_id": user_id})
        )
        # for EE only
        row = cur.fetchone()
    if row:
        if row["data"] and not sessions_favorite.favorite_session_exists(session_id=row["data"]["sessionId"]):
            keys = sessions_mobs. \
                __get_mob_keys(project_id=project_id, session_id=row["data"]["sessionId"])
            keys += sessions_mobs. \
                __get_mob_keys_deprecated(session_id=row["data"]["sessionId"])  # To support old sessions
            tag = config('RETENTION_D_VALUE', default='default')
            for k in keys:
                try:
                    extra.tag_session(file_key=k, tag_value=tag)
                except Exception as e:
                    logger.warning(f"!!!Error while tagging: {k} to {tag} for heatMap")
                    logger.error(str(e))
    return {"state": "success"}


def get_funnel_sessions_by_issue(user_id, project_id, metric_id, issue_id,
                                 data: schemas.CardSessionsSchema
                                 # , range_value=None, start_date=None, end_date=None
                                 ):
    # No need for this because UI is sending the full payload
    # card: dict = get_card(metric_id=metric_id, project_id=project_id, user_id=user_id, flatten=False)
    # if card is None:
    #     return None
    # metric: schemas.CardSchema = schemas.CardSchema(**card)
    # metric: schemas.CardSchema = __merge_metric_with_data(metric=metric, data=data)
    # if metric is None:
    #     return None
    if not card_exists(metric_id=metric_id, project_id=project_id, user_id=user_id):
        return None
    for s in data.series:
        s.filter.startTimestamp = data.startTimestamp
        s.filter.endTimestamp = data.endTimestamp
        s.filter.limit = data.limit
        s.filter.page = data.page
        issues_list = funnels.get_issues_on_the_fly_widget(project_id=project_id, data=s.filter).get("issues", {})
        issues_list = issues_list.get("significant", []) + issues_list.get("insignificant", [])
        issue = None
        for i in issues_list:
            if i.get("issueId", "") == issue_id:
                issue = i
                break
        if issue is None:
            issue = issues.get(project_id=project_id, issue_id=issue_id)
            if issue is not None:
                issue = {**issue,
                         "affectedSessions": 0,
                         "affectedUsers": 0,
                         "conversionImpact": 0,
                         "lostConversions": 0,
                         "unaffectedSessions": 0}
        return {"seriesId": s.series_id, "seriesName": s.name,
                "sessions": sessions.search_sessions(user_id=user_id, project_id=project_id,
                                                     issue=issue, data=s.filter)
                if issue is not None else {"total": 0, "sessions": []},
                "issue": issue}
