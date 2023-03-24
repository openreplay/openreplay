import schemas
import schemas_ee
from chalicelib.core import events, metadata, events_ios, \
    sessions_mobs, issues, resources, assist, sessions_devtool, sessions_notes
from chalicelib.utils import errors_helper
from chalicelib.utils import pg_client, helper


def __group_metadata(session, project_metadata):
    meta = {}
    for m in project_metadata.keys():
        if project_metadata[m] is not None and session.get(m) is not None:
            meta[project_metadata[m]] = session[m]
        session.pop(m)
    return meta


# for backward compatibility
# This function should not use Clickhouse because it doesn't have `file_key`
def get_by_id2_pg(project_id, session_id, context: schemas_ee.CurrentContext, full_data=False,
                  include_fav_viewed=False, group_metadata=False, live=True):
    with pg_client.PostgresClient() as cur:
        extra_query = []
        if include_fav_viewed:
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_favorite_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS favorite""")
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_viewed_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS viewed""")
        query = cur.mogrify(
            f"""\
            SELECT
                s.*,
                s.session_id::text AS session_id,
                (SELECT project_key FROM public.projects WHERE project_id = %(project_id)s LIMIT 1) AS project_key,
                encode(file_key,'hex') AS file_key
                {"," if len(extra_query) > 0 else ""}{",".join(extra_query)}
                {(",json_build_object(" + ",".join([f"'{m}',p.{m}" for m in metadata.column_names()]) + ") AS project_metadata") if group_metadata else ''}
            FROM public.sessions AS s {"INNER JOIN public.projects AS p USING (project_id)" if group_metadata else ""}
            WHERE s.project_id = %(project_id)s
                AND s.session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id, "userId": context.user_id}
        )
        # print("===============")
        # print(query)
        cur.execute(query=query)

        data = cur.fetchone()
        if data is not None:
            data = helper.dict_to_camel_case(data)
            if full_data:
                if data["platform"] == 'ios':
                    data['events'] = events_ios.get_by_sessionId(project_id=project_id, session_id=session_id)
                    for e in data['events']:
                        if e["type"].endswith("_IOS"):
                            e["type"] = e["type"][:-len("_IOS")]
                    data['crashes'] = events_ios.get_crashes_by_session_id(session_id=session_id)
                    data['userEvents'] = events_ios.get_customs_by_sessionId(project_id=project_id,
                                                                             session_id=session_id)
                    data['mobsUrl'] = sessions_mobs.get_ios(session_id=session_id)
                else:
                    data['events'] = events.get_by_session_id(project_id=project_id, session_id=session_id,
                                                              group_clickrage=True)
                    all_errors = events.get_errors_by_session_id(session_id=session_id, project_id=project_id)
                    data['stackEvents'] = [e for e in all_errors if e['source'] != "js_exception"]
                    # to keep only the first stack
                    # limit the number of errors to reduce the response-body size
                    data['errors'] = [errors_helper.format_first_stack_frame(e) for e in all_errors
                                      if e['source'] == "js_exception"][:500]
                    data['userEvents'] = events.get_customs_by_session_id(project_id=project_id,
                                                                          session_id=session_id)
                    data['domURL'] = sessions_mobs.get_urls(session_id=session_id, project_id=project_id)
                    data['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session_id)
                    data['devtoolsURL'] = sessions_devtool.get_urls(session_id=session_id, project_id=project_id,
                                                                    context=context)
                    data['resources'] = resources.get_by_session_id(session_id=session_id, project_id=project_id,
                                                                    start_ts=data["startTs"], duration=data["duration"])

                data['notes'] = sessions_notes.get_session_notes(tenant_id=context.tenant_id, project_id=project_id,
                                                                 session_id=session_id, user_id=context.user_id)
                data['metadata'] = __group_metadata(project_metadata=data.pop("projectMetadata"), session=data)
                data['issues'] = issues.get_by_session_id(session_id=session_id, project_id=project_id)
                data['live'] = live and assist.is_live(project_id=project_id, session_id=session_id,
                                                       project_key=data["projectKey"])
            data["inDB"] = True
            return data
        elif live:
            return assist.get_live_session_by_id(project_id=project_id, session_id=session_id)
        else:
            return None


# This function should not use Clickhouse because it doesn't have `file_key`
def get_replay(project_id, session_id, context: schemas.CurrentContext, full_data=False, include_fav_viewed=False,
               group_metadata=False, live=True):
    with pg_client.PostgresClient() as cur:
        extra_query = []
        if include_fav_viewed:
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_favorite_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS favorite""")
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_viewed_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS viewed""")
        query = cur.mogrify(
            f"""\
            SELECT
                s.*,
                s.session_id::text AS session_id,
                (SELECT project_key FROM public.projects WHERE project_id = %(project_id)s LIMIT 1) AS project_key
                {"," if len(extra_query) > 0 else ""}{",".join(extra_query)}
                {(",json_build_object(" + ",".join([f"'{m}',p.{m}" for m in metadata.column_names()]) + ") AS project_metadata") if group_metadata else ''}
            FROM public.sessions AS s {"INNER JOIN public.projects AS p USING (project_id)" if group_metadata else ""}
            WHERE s.project_id = %(project_id)s
                AND s.session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id, "userId": context.user_id}
        )
        # print("===============")
        # print(query)
        cur.execute(query=query)

        data = cur.fetchone()
        if data is not None:
            data = helper.dict_to_camel_case(data)
            if full_data:
                if data["platform"] == 'ios':
                    data['mobsUrl'] = sessions_mobs.get_ios(session_id=session_id)
                else:
                    data['domURL'] = sessions_mobs.get_urls(session_id=session_id, project_id=project_id)
                    data['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session_id)
                    data['devtoolsURL'] = sessions_devtool.get_urls(session_id=session_id, project_id=project_id,
                                                                    context=context)

                data['metadata'] = __group_metadata(project_metadata=data.pop("projectMetadata"), session=data)
                data['live'] = live and assist.is_live(project_id=project_id, session_id=session_id,
                                                       project_key=data["projectKey"])
            data["inDB"] = True
            return data
        elif live:
            return assist.get_live_session_by_id(project_id=project_id, session_id=session_id)
        else:
            return None


def get_events(project_id, session_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT session_id, platform, start_ts, duration
                FROM public.sessions AS s
                WHERE s.project_id = %(project_id)s
                    AND s.session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id}
        )
        # print("===============")
        # print(query)
        cur.execute(query=query)

        s_data = cur.fetchone()
        if s_data is not None:
            s_data = helper.dict_to_camel_case(s_data)
            data = {}
            if s_data["platform"] == 'ios':
                data['events'] = events_ios.get_by_sessionId(project_id=project_id, session_id=session_id)
                for e in data['events']:
                    if e["type"].endswith("_IOS"):
                        e["type"] = e["type"][:-len("_IOS")]
                data['crashes'] = events_ios.get_crashes_by_session_id(session_id=session_id)
                data['userEvents'] = events_ios.get_customs_by_sessionId(project_id=project_id,
                                                                         session_id=session_id)
            else:
                data['events'] = events.get_by_session_id(project_id=project_id, session_id=session_id,
                                                          group_clickrage=True)
                all_errors = events.get_errors_by_session_id(session_id=session_id, project_id=project_id)
                data['stackEvents'] = [e for e in all_errors if e['source'] != "js_exception"]
                # to keep only the first stack
                # limit the number of errors to reduce the response-body size
                data['errors'] = [errors_helper.format_first_stack_frame(e) for e in all_errors
                                  if e['source'] == "js_exception"][:500]
                data['userEvents'] = events.get_customs_by_session_id(project_id=project_id,
                                                                      session_id=session_id)
                data['resources'] = resources.get_by_session_id(session_id=session_id, project_id=project_id,
                                                                start_ts=s_data["startTs"], duration=s_data["duration"])

            data['issues'] = issues.get_by_session_id(session_id=session_id, project_id=project_id)
            return data
        else:
            return None
