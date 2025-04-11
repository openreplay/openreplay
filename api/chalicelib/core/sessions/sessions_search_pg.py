import logging

import schemas
from chalicelib.core import metadata, projects
from . import sessions_favorite, sessions_legacy
from chalicelib.utils import pg_client, helper

logger = logging.getLogger(__name__)

SESSION_PROJECTION_BASE_COLS = """s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_os,
s.user_browser,
s.user_device,
s.user_device_type,
s.user_country,
s.user_city,
s.user_state,
s.start_ts,
s.duration,
s.events_count,
s.pages_count,
s.errors_count,
s.user_anonymous_id,
s.platform,
s.issue_score,
s.timezone,
to_jsonb(s.issue_types) AS issue_types """

SESSION_PROJECTION_COLS = SESSION_PROJECTION_BASE_COLS + """,
favorite_sessions.session_id NOTNULL            AS favorite,
COALESCE((SELECT TRUE
 FROM public.user_viewed_sessions AS fs
 WHERE s.session_id = fs.session_id
   AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed """


# This function executes the query and return result
def search_sessions(data: schemas.SessionsSearchPayloadSchema, project: schemas.ProjectContext,
                    user_id, errors_only=False, error_status=schemas.ErrorStatus.ALL,
                    count_only=False, issue=None, ids_only=False, platform="web"):
    if data.bookmarked:
        data.startTimestamp, data.endTimestamp = sessions_favorite.get_start_end_timestamp(project.project_id, user_id)
    if data.startTimestamp is None:
        logger.debug(f"No vault sessions found for project:{project.project_id}")
        return {
            'total': 0,
            'sessions': [],
            'src': 1
        }
    full_args, query_part = sessions_legacy.search_query_parts(data=data, error_status=error_status,
                                                               errors_only=errors_only,
                                                               favorite_only=data.bookmarked, issue=issue,
                                                               project_id=project.project_id,
                                                               user_id=user_id, platform=platform)
    if data.limit is not None and data.page is not None:
        full_args["sessions_limit"] = data.limit
        full_args["sessions_limit_s"] = (data.page - 1) * data.limit
        full_args["sessions_limit_e"] = data.page * data.limit
    else:
        full_args["sessions_limit"] = 200
        full_args["sessions_limit_s"] = 0
        full_args["sessions_limit_e"] = 200

    meta_keys = []
    with pg_client.PostgresClient() as cur:
        if errors_only:
            main_query = cur.mogrify(f"""SELECT DISTINCT er.error_id,
                                         COALESCE((SELECT TRUE
                                                     FROM public.user_viewed_errors AS ve
                                                     WHERE er.error_id = ve.error_id
                                                       AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                        {query_part};""", full_args)

        elif count_only:
            main_query = cur.mogrify(f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                COUNT(DISTINCT s.user_uuid) AS count_users
                                        {query_part};""", full_args)
        elif data.group_by_user:
            g_sort = "count(full_sessions)"
            if data.order is None:
                data.order = schemas.SortOrderType.DESC.value
            else:
                data.order = data.order
            if data.sort is not None and data.sort != 'sessionsCount':
                sort = helper.key_to_snake_case(data.sort)
                g_sort = f"{'MIN' if data.order == schemas.SortOrderType.DESC else 'MAX'}({sort})"
            else:
                sort = 'start_ts'

            meta_keys = metadata.get(project_id=project.project_id)
            main_query = cur.mogrify(f"""SELECT COUNT(*) AS count,
                                                COALESCE(JSONB_AGG(users_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                        FROM (SELECT user_id,
                                                 count(full_sessions)                                   AS user_sessions_count,
                                                 jsonb_agg(full_sessions) FILTER (WHERE rn <= 1)        AS last_session,
                                                 MIN(full_sessions.start_ts)                            AS first_session_ts,
                                                 ROW_NUMBER() OVER (ORDER BY {g_sort} {data.order}) AS rn
                                            FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY {sort} {data.order}) AS rn 
                                                FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS} 
                                                                    {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                                    {query_part}
                                                    ) AS filtred_sessions
                                                ) AS full_sessions
                                                GROUP BY user_id
                                            ) AS users_sessions;""",
                                     full_args)
        elif ids_only:
            main_query = cur.mogrify(f"""SELECT DISTINCT ON(s.session_id) s.session_id
                                             {query_part}
                                             ORDER BY s.session_id desc
                                             LIMIT %(sessions_limit)s OFFSET %(sessions_limit_s)s;""",
                                     full_args)
        else:
            if data.order is None:
                data.order = schemas.SortOrderType.DESC.value
            else:
                data.order = data.order
            sort = 'session_id'
            if data.sort is not None and data.sort != "session_id":
                # sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
                if data.sort == 'datetime':
                    sort = 'start_ts'
                else:
                    sort = helper.key_to_snake_case(data.sort)

            meta_keys = metadata.get(project_id=project.project_id)
            main_query = cur.mogrify(f"""SELECT COUNT(full_sessions) AS count, 
                                                COALESCE(JSONB_AGG(full_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                            FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY {sort} {data.order}, issue_score DESC) AS rn
                                            FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS}
                                                                {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                            {query_part}
                                            ORDER BY s.session_id desc) AS filtred_sessions
                                            ORDER BY {sort} {data.order}, issue_score DESC) AS full_sessions;""",
                                     full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            cur.execute(main_query)
            sessions = cur.fetchone()
        except Exception as err:
            logger.warning("--------- SESSIONS SEARCH QUERY EXCEPTION -----------")
            logger.warning(main_query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data.model_dump_json())
            logger.warning("--------------------")
            raise err
        if errors_only or ids_only:
            return helper.list_to_camel_case(cur.fetchall())

        if count_only:
            return helper.dict_to_camel_case(sessions)

        total = sessions["count"]
        sessions = sessions["sessions"]

    if data.group_by_user:
        for i, s in enumerate(sessions):
            sessions[i] = {**s.pop("last_session")[0], **s}
            sessions[i].pop("rn")
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i][f'metadata_{k["index"]}'] is not None}
    else:
        for i, s in enumerate(sessions):
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i][f'metadata_{k["index"]}'] is not None}
    # if not data.group_by_user and data.sort is not None and data.sort != "session_id":
    #     sessions = sorted(sessions, key=lambda s: s[helper.key_to_snake_case(data.sort)],
    #                       reverse=data.order.upper() == "DESC")
    return {
        'total': total,
        'sessions': helper.list_to_camel_case(sessions),
        'src': 1
    }


def search_by_metadata(tenant_id, user_id, m_key, m_value, project_id=None):
    if project_id is None:
        all_projects = projects.get_projects(tenant_id=tenant_id)
    else:
        all_projects = [
            projects.get_project(tenant_id=tenant_id, project_id=int(project_id), include_last_session=False,
                                 include_gdpr=False)]

    all_projects = {int(p["projectId"]): p["name"] for p in all_projects}
    project_ids = list(all_projects.keys())

    available_keys = metadata.get_keys_by_projects(project_ids)
    for i in available_keys:
        available_keys[i]["user_id"] = schemas.FilterType.USER_ID
        available_keys[i]["user_anonymous_id"] = schemas.FilterType.USER_ANONYMOUS_ID
    results = {}
    for i in project_ids:
        if m_key not in available_keys[i].values():
            available_keys.pop(i)
            results[i] = {"total": 0, "sessions": [], "missingMetadata": True}
    project_ids = list(available_keys.keys())
    if len(project_ids) > 0:
        with pg_client.PostgresClient() as cur:
            sub_queries = []
            for i in project_ids:
                col_name = list(available_keys[i].keys())[list(available_keys[i].values()).index(m_key)]
                sub_queries.append(cur.mogrify(
                    f"(SELECT COALESCE(COUNT(s.*)) AS count FROM public.sessions AS s WHERE s.project_id = %(id)s AND s.{col_name} = %(value)s) AS \"{i}\"",
                    {"id": i, "value": m_value}).decode('UTF-8'))
            query = f"""SELECT {", ".join(sub_queries)};"""
            cur.execute(query=query)

            rows = cur.fetchone()

            sub_queries = []
            for i in rows.keys():
                results[i] = {"total": rows[i], "sessions": [], "missingMetadata": False, "name": all_projects[int(i)]}
                if rows[i] > 0:
                    col_name = list(available_keys[int(i)].keys())[list(available_keys[int(i)].values()).index(m_key)]
                    sub_queries.append(
                        cur.mogrify(
                            f"""(
                                    SELECT *
                                    FROM (
                                            SELECT DISTINCT ON(favorite_sessions.session_id, s.session_id) {SESSION_PROJECTION_COLS}
                                            FROM public.sessions AS s LEFT JOIN (SELECT session_id
                                                                                    FROM public.user_favorite_sessions
                                                                                    WHERE user_favorite_sessions.user_id = %(userId)s
                                                                                ) AS favorite_sessions USING (session_id)
                                            WHERE s.project_id = %(id)s AND s.duration IS NOT NULL AND s.{col_name} = %(value)s
                                        ) AS full_sessions
                                    ORDER BY favorite DESC, issue_score DESC
                                    LIMIT 10
                                )""",
                            {"id": i, "value": m_value, "userId": user_id}).decode('UTF-8'))
            if len(sub_queries) > 0:
                cur.execute("\nUNION\n".join(sub_queries))
                rows = cur.fetchall()
                for i in rows:
                    results[str(i["project_id"])]["sessions"].append(helper.dict_to_camel_case(i))
    return results


def search_sessions_by_ids(project_id: int, session_ids: list, sort_by: str = 'session_id',
                           ascending: bool = False) -> dict:
    if session_ids is None or len(session_ids) == 0:
        return {"total": 0, "sessions": []}
    with pg_client.PostgresClient() as cur:
        meta_keys = metadata.get(project_id=project_id)
        params = {"project_id": project_id, "session_ids": tuple(session_ids)}
        order_direction = 'ASC' if ascending else 'DESC'
        main_query = cur.mogrify(f"""SELECT {SESSION_PROJECTION_BASE_COLS}
                                            {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                     FROM public.sessions AS s
                                        WHERE project_id=%(project_id)s 
                                            AND session_id IN %(session_ids)s
                                     ORDER BY {sort_by} {order_direction};""", params)

        cur.execute(main_query)
        rows = cur.fetchall()
        if len(meta_keys) > 0:
            for s in rows:
                s["metadata"] = {}
                for m in meta_keys:
                    s["metadata"][m["key"]] = s.pop(f'metadata_{m["index"]}')
    return {"total": len(rows), "sessions": helper.list_to_camel_case(rows)}
