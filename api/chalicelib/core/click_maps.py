import schemas
from chalicelib.core import sessions_mobs, sessions_legacy as sessions_search, events
from chalicelib.utils import pg_client, helper

SESSION_PROJECTION_COLS = """s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_os,
s.user_browser,
s.user_device,
s.user_device_type,
s.user_country,
s.start_ts,
s.duration,
s.events_count,
s.pages_count,
s.errors_count,
s.user_anonymous_id,
s.platform,
s.issue_score,
to_jsonb(s.issue_types) AS issue_types,
favorite_sessions.session_id NOTNULL            AS favorite,
COALESCE((SELECT TRUE
 FROM public.user_viewed_sessions AS fs
 WHERE s.session_id = fs.session_id
   AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed """


def search_short_session(data: schemas.ClickMapSessionsSearch, project_id, user_id, include_mobs: bool = True):
    no_platform = True
    for f in data.filters:
        if f.type == schemas.FilterType.platform:
            no_platform = False
            break
    if no_platform:
        data.filters.append(schemas.SessionSearchFilterSchema(type=schemas.FilterType.platform,
                                                              value=[schemas.PlatformType.desktop],
                                                              operator=schemas.SearchEventOperator._is))

    full_args, query_part = sessions_search.search_query_parts(data=data, error_status=None, errors_only=False,
                                                               favorite_only=data.bookmarked, issue=None,
                                                               project_id=project_id, user_id=user_id)

    with pg_client.PostgresClient() as cur:
        data.order = schemas.SortOrderType.desc
        data.sort = 'duration'

        # meta_keys = metadata.get(project_id=project_id)
        meta_keys = []
        main_query = cur.mogrify(f"""SELECT {SESSION_PROJECTION_COLS}
                                                {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                     {query_part}
                                     ORDER BY {data.sort} {data.order.value}
                                     LIMIT 1;""", full_args)
        # print("--------------------")
        # print(main_query)
        # print("--------------------")
        try:
            cur.execute(main_query)
        except Exception as err:
            print("--------- CLICK MAP SHORT SESSION SEARCH QUERY EXCEPTION -----------")
            print(main_query.decode('UTF-8'))
            print("--------- PAYLOAD -----------")
            print(data.model_dump_json())
            print("--------------------")
            raise err

        session = cur.fetchone()
    if session:
        if include_mobs:
            session['domURL'] = sessions_mobs.get_urls(session_id=session["session_id"], project_id=project_id)
            session['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session["session_id"])
        session['events'] = events.get_by_session_id(project_id=project_id, session_id=session["session_id"],
                                                     event_type=schemas.EventType.location)

    return helper.dict_to_camel_case(session)
