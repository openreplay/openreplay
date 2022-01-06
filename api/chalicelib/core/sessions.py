import schemas
from chalicelib.core import events, metadata, events_ios, \
    sessions_mobs, issues, projects, errors, resources, assist, performance_event
from chalicelib.utils import pg_client, helper, dev, metrics_helper

SESSION_PROJECTION_COLS = """s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_agent,
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


def __group_metadata(session, project_metadata):
    meta = []
    for m in project_metadata.keys():
        if project_metadata[m] is not None and session.get(m) is not None:
            meta.append({project_metadata[m]: session[m]})
        session.pop(m)
    return meta


def get_by_id2_pg(project_id, session_id, user_id, full_data=False, include_fav_viewed=False, group_metadata=False):
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
                {(",json_build_object(" + ",".join([f"'{m}',p.{m}" for m in metadata._get_column_names()]) + ") AS project_metadata") if group_metadata else ''}
            FROM public.sessions AS s {"INNER JOIN public.projects AS p USING (project_id)" if group_metadata else ""}
            WHERE s.project_id = %(project_id)s
                AND s.session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id, "userId": user_id}
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
                    data['mobsUrl'] = sessions_mobs.get_ios(sessionId=session_id)
                else:
                    data['events'] = events.get_by_sessionId2_pg(project_id=project_id, session_id=session_id,
                                                                 group_clickrage=True)
                    all_errors = events.get_errors_by_session_id(session_id=session_id)
                    data['stackEvents'] = [e for e in all_errors if e['source'] != "js_exception"]
                    # to keep only the first stack
                    data['errors'] = [errors.format_first_stack_frame(e) for e in all_errors if
                                      e['source'] == "js_exception"][
                                     :500]  # limit the number of errors to reduce the response-body size
                    data['userEvents'] = events.get_customs_by_sessionId2_pg(project_id=project_id,
                                                                             session_id=session_id)
                    data['mobsUrl'] = sessions_mobs.get_web(sessionId=session_id)
                    data['resources'] = resources.get_by_session_id(session_id=session_id)

                data['metadata'] = __group_metadata(project_metadata=data.pop("projectMetadata"), session=data)
                data['issues'] = issues.get_by_session_id(session_id=session_id)
                data['live'] = assist.is_live(project_id=project_id,
                                              session_id=session_id,
                                              project_key=data["projectKey"])

            return data
    return None


def __get_sql_operator(op: schemas.SearchEventOperator):
    return {
        schemas.SearchEventOperator._is: "=",
        schemas.SearchEventOperator._is_any: "IN",
        schemas.SearchEventOperator._on: "=",
        schemas.SearchEventOperator._on_any: "IN",
        schemas.SearchEventOperator._is_not: "!=",
        schemas.SearchEventOperator._not_on: "!=",
        schemas.SearchEventOperator._contains: "ILIKE",
        schemas.SearchEventOperator._not_contains: "NOT ILIKE",
        schemas.SearchEventOperator._starts_with: "ILIKE",
        schemas.SearchEventOperator._ends_with: "ILIKE",
    }.get(op, "=")


def __is_negation_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._is_not,
                  schemas.SearchEventOperator._not_on,
                  schemas.SearchEventOperator._not_contains]


def __reverse_sql_operator(op):
    return "=" if op == "!=" else "!=" if op == "=" else "ILIKE" if op == "NOT ILIKE" else "NOT ILIKE"


def __get_sql_operator_multiple(op: schemas.SearchEventOperator):
    return " IN " if op not in [schemas.SearchEventOperator._is_not, schemas.SearchEventOperator._not_on,
                                schemas.SearchEventOperator._not_contains] else " NOT IN "


def __get_sql_value_multiple(values):
    if isinstance(values, tuple):
        return values
    return tuple(values) if isinstance(values, list) else (values,)


def _multiple_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def _multiple_values(values, value_key="value"):
    query_values = {}
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query_values[k] = values[i]
    return query_values


def _isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._on_any, schemas.SearchEventOperator._is_any]


@dev.timed
def search2_pg(data: schemas.SessionsSearchPayloadSchema, project_id, user_id, favorite_only=False, errors_only=False,
               error_status="ALL", count_only=False, issue=None):
    full_args, query_part, sort = search_query_parts(data, error_status, errors_only, favorite_only, issue, project_id,
                                                     user_id)

    with pg_client.PostgresClient() as cur:
        if errors_only:
            main_query = cur.mogrify(f"""SELECT DISTINCT er.error_id, ser.status, ser.parent_error_id, ser.payload,
                                        COALESCE((SELECT TRUE
                                         FROM public.user_favorite_sessions AS fs
                                         WHERE s.session_id = fs.session_id
                                           AND fs.user_id = %(userId)s), FALSE)   AS favorite,
                                        COALESCE((SELECT TRUE
                                                     FROM public.user_viewed_errors AS ve
                                                     WHERE er.error_id = ve.error_id
                                                       AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                {query_part};""", full_args)

        elif count_only:
            main_query = cur.mogrify(f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                COUNT(DISTINCT s.user_uuid) AS count_users
                                        {query_part};""", full_args)
        else:
            main_query = cur.mogrify(f"""SELECT COUNT(full_sessions) AS count, COALESCE(JSONB_AGG(full_sessions) FILTER (WHERE rn <= 200), '[]'::JSONB) AS sessions
                                            FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY favorite DESC, issue_score DESC, session_id desc, start_ts desc) AS rn FROM
                                            (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS}
                                            {query_part}
                                            ORDER BY s.session_id desc) AS filtred_sessions
                                            ORDER BY favorite DESC, issue_score DESC, {sort} {data.order}) AS full_sessions;""",
                                     full_args)

            # main_query = cur.mogrify(f"""SELECT * FROM
            #                             (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS}
            #                             {query_part}
            #                             ORDER BY s.session_id desc) AS filtred_sessions
            #                             ORDER BY favorite DESC, issue_score DESC, {sort} {order};""",
            #                          full_args)

        # print("--------------------")
        # print(main_query)

        cur.execute(main_query)
        # print("--------------------")
        if count_only:
            return helper.dict_to_camel_case(cur.fetchone())
        sessions = cur.fetchone()
        total = sessions["count"]
        sessions = sessions["sessions"]
        # sessions = []
        # total = cur.rowcount
        # row = cur.fetchone()
        # limit = 200
        # while row is not None and len(sessions) < limit:
        #     if row.get("favorite"):
        #         limit += 1
        #     sessions.append(row)
        #     row = cur.fetchone()

    if errors_only:
        return sessions
    if data.sort is not None and data.sort != "session_id":
        sessions = sorted(sessions, key=lambda s: s[helper.key_to_snake_case(data.sort)],
                          reverse=data.order.upper() == "DESC")
    return {
        'total': total,
        'sessions': helper.list_to_camel_case(sessions)
    }


@dev.timed
def search2_series(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                   view_type: schemas.MetricViewType):
    step_size = metrics_helper.__get_step_size(endTimestamp=data.endDate, startTimestamp=data.startDate,
                                               density=density, factor=1)
    full_args, query_part, sort = search_query_parts(data=data, error_status=None, errors_only=False,
                                                     favorite_only=False, issue=None, project_id=project_id,
                                                     user_id=None)
    full_args["step_size"] = step_size
    with pg_client.PostgresClient() as cur:
        if view_type == schemas.MetricViewType.line_chart:
            main_query = cur.mogrify(f"""WITH full_sessions AS (SELECT DISTINCT ON(s.session_id) s.session_id, s.start_ts
                                                            {query_part})
                                        SELECT generated_timestamp AS timestamp,
                                               COUNT(s)            AS count
                                        FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS generated_timestamp
                                                 LEFT JOIN LATERAL ( SELECT 1 AS s
                                                                     FROM full_sessions
                                                                     WHERE start_ts >= generated_timestamp
                                                                       AND start_ts < generated_timestamp + %(step_size)s) AS sessions ON (TRUE)
                                        GROUP BY generated_timestamp
                                        ORDER BY generated_timestamp;""", full_args)
        else:
            main_query = cur.mogrify(f"""SELECT count(DISTINCT s.session_id) AS count
                                        {query_part};""", full_args)

        # print("--------------------")
        # print(main_query)
        cur.execute(main_query)
        # print("--------------------")
        if view_type == schemas.MetricViewType.line_chart:
            sessions = cur.fetchall()
        else:
            sessions = cur.fetchone()["count"]
        return sessions


def search_query_parts(data, error_status, errors_only, favorite_only, issue, project_id, user_id):
    ss_constraints = []
    full_args = {"project_id": project_id, "startDate": data.startDate, "endDate": data.endDate,
                 "projectId": project_id, "userId": user_id}
    extra_constraints = [
        "s.project_id = %(project_id)s",
        "s.duration IS NOT NULL"
    ]
    extra_from = ""
    fav_only_join = ""
    if favorite_only and not errors_only:
        fav_only_join = "LEFT JOIN public.user_favorite_sessions AS fs ON fs.session_id = s.session_id"
        extra_constraints.append("fs.user_id = %(userId)s")
        full_args["userId"] = user_id
    events_query_part = ""
    if len(data.filters) > 0:
        meta_keys = None
        for i, f in enumerate(data.filters):
            if not isinstance(f.value, list):
                f.value = [f.value]
            if len(f.value) == 0 or f.value[0] is None:
                continue
            filter_type = f.type
            # f.value = __get_sql_value_multiple(f.value)
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, **_multiple_values(f.value, value_key=f_k)}
            op = __get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.events_count] else f.operator
            is_any = _isAny_opreator(f.operator)
            is_not = False
            if __is_negation_operator(f.operator):
                is_not = True
                # op = __reverse_sql_operator(op)
            if filter_type == schemas.FilterType.user_browser:
                # op = __get_sql_operator_multiple(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_os, schemas.FilterType.user_os_ios]:
                # op = __get_sql_operator_multiple(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_device, schemas.FilterType.user_device_ios]:
                # op = __get_sql_operator_multiple(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_country, schemas.FilterType.user_country_ios]:
                # op = __get_sql_operator_multiple(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.utm_source]:
                if is_any:
                    extra_constraints.append('s.utm_source IS NOT NULL')
                    ss_constraints.append('ms.utm_source  IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_source {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_source {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_medium]:
                if is_any:
                    extra_constraints.append('s.utm_medium IS NOT NULL')
                    ss_constraints.append('ms.utm_medium IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_medium {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_medium {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_campaign]:
                if is_any:
                    extra_constraints.append('s.utm_campaign IS NOT NULL')
                    ss_constraints.append('ms.utm_campaign IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_campaign {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_campaign {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type == schemas.FilterType.duration:
                if len(f.value) > 0 and f.value[0] is not None:
                    extra_constraints.append("s.duration >= %(minDuration)s")
                    ss_constraints.append("ms.duration >= %(minDuration)s")
                    full_args["minDuration"] = f.value[0]
                if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    extra_constraints.append("s.duration <= %(maxDuration)s")
                    ss_constraints.append("ms.duration <= %(maxDuration)s")
                    full_args["maxDuration"] = f.value[1]
            elif filter_type == schemas.FilterType.referrer:
                # events_query_part = events_query_part + f"INNER JOIN events.pages AS p USING(session_id)"
                extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
                # op = __get_sql_operator_multiple(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"p.base_referrer {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
            elif filter_type == events.event_type.METADATA.ui_type:
                # get metadata list only if you need it
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                # op = __get_sql_operator(f.operator)
                if f.key in meta_keys.keys():
                    extra_constraints.append(
                        _multiple_conditions(f"s.{metadata.index_to_colname(meta_keys[f.key])} {op} %({f_k})s",
                                             f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.{metadata.index_to_colname(meta_keys[f.key])} {op} %({f_k})s",
                                             f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_id {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_id {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.user_anonymous_id,
                                 schemas.FilterType.user_anonymous_id_ios]:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_anonymous_id {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_anonymous_id {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.rev_id {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.rev_id {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
            elif filter_type == schemas.FilterType.platform:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type == schemas.FilterType.issue:
                extra_constraints.append(
                    _multiple_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type == schemas.FilterType.events_count:
                extra_constraints.append(
                    _multiple_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
    # ---------------------------------------------------------------------------
    if len(data.events) > 0:
        # ss_constraints = [s.decode('UTF-8') for s in ss_constraints]
        events_query_from = []
        event_index = 0
        or_events = data.events_order == schemas.SearchEventOrder._or
        # events_joiner = " FULL JOIN " if or_events else " INNER JOIN LATERAL "
        events_joiner = " UNION " if or_events else " INNER JOIN LATERAL "
        for i, event in enumerate(data.events):
            event_type = event.type
            is_any = _isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            op = __get_sql_operator(event.operator)
            is_not = False
            if __is_negation_operator(event.operator):
                is_not = True
                op = __reverse_sql_operator(op)
            if event_index == 0 or or_events:
                event_from = "%s INNER JOIN public.sessions AS ms USING (session_id)"
                event_where = ["ms.project_id = %(projectId)s", "main.timestamp >= %(startDate)s",
                               "main.timestamp <= %(endDate)s", "ms.start_ts >= %(startDate)s",
                               "ms.start_ts <= %(endDate)s", "ms.duration IS NOT NULL"]
            else:
                event_from = "%s"
                event_where = ["main.timestamp >= %(startDate)s", "main.timestamp <= %(endDate)s",
                               "main.session_id=event_0.session_id"]
                if data.events_order == schemas.SearchEventOrder._then:
                    event_where.append(f"event_{event_index - 1}.timestamp <= main.timestamp")
            e_k = f"e_value{i}"
            if event.type != schemas.PerformanceEventType.time_between_events:
                event.value = helper.values_for_operator(value=event.value, op=event.operator)
                full_args = {**full_args, **_multiple_values(event.value, value_key=e_k)}

            # if event_type not in list(events.SUPPORTED_TYPES.keys()) \
            #         or event.value in [None, "", "*"] \
            #         and (event_type != events.event_type.ERROR.ui_type \
            #              or event_type != events.event_type.ERROR_IOS.ui_type):
            #     continue
            if event_type == events.event_type.CLICK.ui_type:
                event_from = event_from % f"{events.event_type.CLICK.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CLICK.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))

            elif event_type == events.event_type.INPUT.ui_type:
                event_from = event_from % f"{events.event_type.INPUT.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.INPUT.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
                if event.custom is not None and len(event.custom) > 0:
                    event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.custom,
                                                            value_key=f"custom{i}"))
                    full_args = {**full_args, **_multiple_values(event.custom, value_key=f"custom{i}")}

            elif event_type == events.event_type.LOCATION.ui_type:
                event_from = event_from % f"{events.event_type.LOCATION.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.CUSTOM.ui_type:
                event_from = event_from % f"{events.event_type.CUSTOM.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CUSTOM.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.REQUEST.ui_type:
                event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.GRAPHQL.ui_type:
                event_from = event_from % f"{events.event_type.GRAPHQL.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.STATEACTION.ui_type:
                event_from = event_from % f"{events.event_type.STATEACTION.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.STATEACTION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.ERROR.ui_type:
                # if event.source in [None, "*", ""]:
                #     event.source = "js_exception"
                event_from = event_from % f"{events.event_type.ERROR.table} AS main INNER JOIN public.errors AS main1 USING(error_id)"
                if event.value not in [None, "*", ""]:
                    if not is_any:
                        event_where.append(f"(main1.message {op} %({e_k})s OR main1.name {op} %({e_k})s)")
                    if event.source not in [None, "*", ""]:
                        event_where.append(f"main1.source = %(source)s")
                        full_args["source"] = event.source
                elif event.source not in [None, "*", ""]:
                    event_where.append(f"main1.source = %(source)s")
                    full_args["source"] = event.source

            # ----- IOS
            elif event_type == events.event_type.CLICK_IOS.ui_type:
                event_from = event_from % f"{events.event_type.CLICK_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CLICK_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))

            elif event_type == events.event_type.INPUT_IOS.ui_type:
                event_from = event_from % f"{events.event_type.INPUT_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.INPUT_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                if event.custom is not None and len(event.custom) > 0:
                    event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.custom,
                                                            value_key="custom{i}"))
                    full_args = {**full_args, **_multiple_values(event.custom, f"custom{i}")}
            elif event_type == events.event_type.VIEW_IOS.ui_type:
                event_from = event_from % f"{events.event_type.VIEW_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.VIEW_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.CUSTOM_IOS.ui_type:
                event_from = event_from % f"{events.event_type.CUSTOM_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CUSTOM_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.REQUEST_IOS.ui_type:
                event_from = event_from % f"{events.event_type.REQUEST_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.ERROR_IOS.ui_type:
                event_from = event_from % f"{events.event_type.ERROR_IOS.table} AS main INNER JOIN public.crashes_ios AS main1 USING(crash_id)"
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        _multiple_conditions(f"(main1.reason {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                             event.value, value_key=e_k))
            elif event_type == schemas.PerformanceEventType.fetch_failed:
                event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                col = performance_event.get_col(event_type)
                colname = col["column"]
                event_where.append(f"main.{colname} = FALSE")
            # elif event_type == schemas.PerformanceEventType.fetch_duration:
            #     event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
            #                                  event.value, value_key=e_k))
            #     col = performance_event.get_col(event_type)
            #     colname = col["column"]
            #     tname = "main"
            #     e_k += "_custom"
            #     full_args = {**full_args, **_multiple_values(event.custom, value_key=e_k)}
            #     event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
            #                        _multiple_conditions(f"{tname}.{colname} {event.customOperator} %({e_k})s",
            #                                             event.custom, value_key=e_k))
            elif event_type in [schemas.PerformanceEventType.location_dom_complete,
                                schemas.PerformanceEventType.location_largest_contentful_paint_time,
                                schemas.PerformanceEventType.location_ttfb,
                                schemas.PerformanceEventType.location_avg_cpu_load,
                                schemas.PerformanceEventType.location_avg_memory_usage
                                ]:
                event_from = event_from % f"{events.event_type.LOCATION.table} AS main "
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if col.get("extraJoin") is not None:
                    tname = "ej"
                    event_from += f" INNER JOIN {col['extraJoin']} AS {tname} USING(session_id)"
                    event_where += [f"{tname}.timestamp >= main.timestamp", f"{tname}.timestamp >= %(startDate)s",
                                    f"{tname}.timestamp <= %(endDate)s"]
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.custom, value_key=e_k)}

                event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.customOperator} %({e_k})s",
                                                        event.custom, value_key=e_k))
            elif event_type == schemas.PerformanceEventType.time_between_events:
                event_from = event_from % f"{getattr(events.event_type, event.value[0].type).table} AS main INNER JOIN {getattr(events.event_type, event.value[1].type).table} AS main2 USING(session_id) "
                if not isinstance(event.value[0].value, list):
                    event.value[0].value = [event.value[0].value]
                if not isinstance(event.value[1].value, list):
                    event.value[1].value = [event.value[1].value]
                event.value[0].value = helper.values_for_operator(value=event.value[0].value,
                                                                  op=event.value[0].operator)
                event.value[1].value = helper.values_for_operator(value=event.value[1].value,
                                                                  op=event.value[0].operator)
                e_k1 = e_k + "_e1"
                e_k2 = e_k + "_e2"
                full_args = {**full_args,
                             **_multiple_values(event.value[0].value, value_key=e_k1),
                             **_multiple_values(event.value[1].value, value_key=e_k2)}
                s_op = __get_sql_operator(event.value[0].operator)
                event_where += ["main2.timestamp >= %(startDate)s", "main2.timestamp <= %(endDate)s"]
                if event_index > 0 and not or_events:
                    event_where.append("main2.session_id=event_0.session_id")
                event_where.append(
                    _multiple_conditions(
                        f"main.{getattr(events.event_type, event.value[0].type).column} {s_op} %({e_k1})s",
                        event.value[0].value, value_key=e_k1))
                s_op = __get_sql_operator(event.value[1].operator)
                event_where.append(
                    _multiple_conditions(
                        f"main2.{getattr(events.event_type, event.value[1].type).column} {s_op} %({e_k2})s",
                        event.value[1].value, value_key=e_k2))

                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.custom, value_key=e_k)}
                event_where.append(
                    _multiple_conditions(f"main2.timestamp - main.timestamp {event.customOperator} %({e_k})s",
                                         event.custom, value_key=e_k))


            else:
                continue
            if event_index == 0 or or_events:
                event_where += ss_constraints
            if is_not:
                if event_index == 0 or or_events:
                    events_query_from.append(f"""\
                                    (SELECT
                                        session_id, 
                                        0 AS timestamp
                                      FROM sessions
                                      WHERE EXISTS(SELECT session_id 
                                                    FROM {event_from} 
                                                    WHERE {" AND ".join(event_where)} 
                                                        AND sessions.session_id=ms.session_id) IS FALSE
                                        AND project_id = %(projectId)s 
                                        AND start_ts >= %(startDate)s
                                        AND start_ts <= %(endDate)s
                                        AND duration IS NOT NULL
                                    ) {"" if or_events else ("AS event_{event_index}" + ("ON(TRUE)" if event_index > 0 else ""))}\
                                    """)
                else:
                    events_query_from.append(f"""\
            (SELECT
                event_0.session_id, 
                event_{event_index - 1}.timestamp AS timestamp
              WHERE EXISTS(SELECT session_id FROM {event_from} WHERE {" AND ".join(event_where)}) IS FALSE
            ) AS event_{event_index} {"ON(TRUE)" if event_index > 0 else ""}\
            """)
            else:
                events_query_from.append(f"""\
            (SELECT main.session_id, MIN(main.timestamp) AS timestamp
              FROM {event_from}
              WHERE {" AND ".join(event_where)}
              GROUP BY 1
            ) {"" if or_events else (f"AS event_{event_index} " + ("ON(TRUE)" if event_index > 0 else ""))}\
            """)
            event_index += 1
        if event_index > 0:
            if or_events:
                events_query_part = f"""SELECT
                                            session_id, 
                                            MIN(timestamp) AS first_event_ts, 
                                            MAX(timestamp) AS last_event_ts
                                        FROM ({events_joiner.join(events_query_from)}) AS u
                                        GROUP BY 1
                                        {fav_only_join}"""
            else:
                events_query_part = f"""SELECT
                                        event_0.session_id,
                                        MIN(event_0.timestamp) AS first_event_ts,
                                        MAX(event_{event_index - 1}.timestamp) AS last_event_ts
                                    FROM {events_joiner.join(events_query_from)}
                                    GROUP BY 1
                                    {fav_only_join}"""
    else:
        data.events = []
    # ---------------------------------------------------------------------------
    if data.startDate is not None:
        extra_constraints.append("s.start_ts >= %(startDate)s")
    if data.endDate is not None:
        extra_constraints.append("s.start_ts <= %(endDate)s")
    # if data.platform is not None:
    #     if data.platform == schemas.PlatformType.mobile:
    #         extra_constraints.append(b"s.user_os in ('Android','BlackBerry OS','iOS','Tizen','Windows Phone')")
    #     elif data.platform == schemas.PlatformType.desktop:
    #         extra_constraints.append(
    #             b"s.user_os in ('Chrome OS','Fedora','Firefox OS','Linux','Mac OS X','Ubuntu','Windows')")
    if data.order is None:
        data.order = "DESC"
    sort = 'session_id'
    if data.sort is not None and data.sort != "session_id":
        sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
    else:
        sort = 'session_id'
    if errors_only:
        extra_from += f" INNER JOIN {events.event_type.ERROR.table} AS er USING (session_id) INNER JOIN public.errors AS ser USING (error_id)"
        extra_constraints.append("ser.source = 'js_exception'")
        if error_status != "ALL":
            extra_constraints.append("ser.status = %(error_status)s")
            full_args["status"] = error_status.lower()
        if favorite_only:
            extra_from += " INNER JOIN public.user_favorite_errors AS ufe USING (error_id)"
            extra_constraints.append("ufe.user_id = %(user_id)s")
    # extra_constraints = [extra.decode('UTF-8') + "\n" for extra in extra_constraints]
    if not favorite_only and not errors_only and user_id is not None:
        extra_from += """LEFT JOIN (SELECT user_id, session_id
                                    FROM public.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    USING (session_id)"""
    extra_join = ""
    if issue is not None:
        extra_join = """
                INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                WHERE issues.session_id=f.session_id 
                    AND p_issues.type=%(issue_type)s 
                    AND p_issues.context_string=%(issue_contextString)s
                    AND timestamp >= f.first_event_ts
                    AND timestamp <= f.last_event_ts) AS issues ON(TRUE)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    query_part = f"""\
                        FROM {f"({events_query_part}) AS f" if len(events_query_part) > 0 else "public.sessions AS s"}
                        {extra_join}
                        {"INNER JOIN public.sessions AS s USING(session_id)" if len(events_query_part) > 0 else ""}
                        {extra_from}
                        WHERE 
                          {" AND ".join(extra_constraints)}"""
    return full_args, query_part, sort


def search_by_metadata(tenant_id, user_id, m_key, m_value, project_id=None):
    if project_id is None:
        all_projects = projects.get_projects(tenant_id=tenant_id, recording_state=False)
    else:
        all_projects = [
            projects.get_project(tenant_id=tenant_id, project_id=int(project_id), include_last_session=False,
                                 include_gdpr=False)]

    all_projects = {int(p["projectId"]): p["name"] for p in all_projects}
    project_ids = list(all_projects.keys())

    available_keys = metadata.get_keys_by_projects(project_ids)
    for i in available_keys:
        available_keys[i]["user_id"] = schemas.FilterType.user_id
        available_keys[i]["user_anonymous_id"] = schemas.FilterType.user_anonymous_id
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


def search_by_issue(user_id, issue, project_id, start_date, end_date):
    constraints = ["s.project_id = %(projectId)s",
                   "p_issues.context_string = %(issueContextString)s",
                   "p_issues.type = %(issueType)s"]
    if start_date is not None:
        constraints.append("start_ts >= %(startDate)s")
    if end_date is not None:
        constraints.append("start_ts <= %(endDate)s")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT DISTINCT ON(favorite_sessions.session_id, s.session_id) {SESSION_PROJECTION_COLS}
            FROM public.sessions AS s
                                INNER JOIN events_common.issues USING (session_id)
                                INNER JOIN public.issues AS p_issues USING (issue_id)
                                LEFT JOIN (SELECT user_id, session_id
                                            FROM public.user_favorite_sessions
                                            WHERE user_id = %(userId)s) AS favorite_sessions
                                           USING (session_id)
            WHERE {" AND ".join(constraints)}
            ORDER BY s.session_id DESC;""",
                {
                    "issueContextString": issue["contextString"],
                    "issueType": issue["type"], "userId": user_id,
                    "projectId": project_id,
                    "startDate": start_date,
                    "endDate": end_date
                }))

        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def get_favorite_sessions(project_id, user_id, include_viewed=False):
    with pg_client.PostgresClient() as cur:
        query_part = cur.mogrify(f"""\
            FROM public.sessions AS s 
                LEFT JOIN public.user_favorite_sessions AS fs ON fs.session_id = s.session_id
            WHERE fs.user_id = %(userId)s""",
                                 {"projectId": project_id, "userId": user_id}
                                 )

        extra_query = b""
        if include_viewed:
            extra_query = cur.mogrify(""",\
            COALESCE((SELECT TRUE
             FROM public.user_viewed_sessions AS fs
             WHERE s.session_id = fs.session_id
               AND fs.user_id = %(userId)s), FALSE) AS viewed""",
                                      {"projectId": project_id, "userId": user_id})

        cur.execute(f"""\
                    SELECT s.project_id,
                           s.session_id::text AS session_id,
                           s.user_uuid,
                           s.user_id,
                           s.user_agent,
                           s.user_os,
                           s.user_browser,
                           s.user_device,
                           s.user_country,
                           s.start_ts,
                           s.duration,
                           s.events_count,
                           s.pages_count,
                           s.errors_count,
                           TRUE AS favorite
                           {extra_query.decode('UTF-8')}                            
                    {query_part.decode('UTF-8')}
                    ORDER BY s.session_id         
                    LIMIT 50;""")

        sessions = cur.fetchall()
    return helper.list_to_camel_case(sessions)


def get_user_sessions(project_id, user_id, start_date, end_date):
    with pg_client.PostgresClient() as cur:
        constraints = ["s.project_id = %(projectId)s", "s.user_id = %(userId)s"]
        if start_date is not None:
            constraints.append("s.start_ts >= %(startDate)s")
        if end_date is not None:
            constraints.append("s.start_ts <= %(endDate)s")

        query_part = f"""\
            FROM public.sessions AS s
            WHERE {" AND ".join(constraints)}"""

        cur.execute(cur.mogrify(f"""\
                    SELECT s.project_id,
                           s.session_id::text AS session_id,
                           s.user_uuid,
                           s.user_id,
                           s.user_agent,
                           s.user_os,
                           s.user_browser,
                           s.user_device,
                           s.user_country,
                           s.start_ts,
                           s.duration,
                           s.events_count,
                           s.pages_count,
                           s.errors_count
                    {query_part}
                    ORDER BY s.session_id         
                    LIMIT 50;""", {
            "projectId": project_id,
            "userId": user_id,
            "startDate": start_date,
            "endDate": end_date
        }))

        sessions = cur.fetchall()
    return helper.list_to_camel_case(sessions)


def get_session_user(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT
                user_id,
                count(*) as session_count,	
                max(start_ts) as last_seen,
                min(start_ts) as first_seen
            FROM
                "public".sessions
            WHERE
                project_id = %(project_id)s
                AND user_id = %(user_id)s
                AND duration is not null
            GROUP BY user_id;
            """,
            {"project_id": project_id, "user_id": user_id}
        )
        cur.execute(query=query)
        data = cur.fetchone()
    return helper.dict_to_camel_case(data)


def get_session_ids_by_user_ids(project_id, user_ids):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT session_id FROM public.sessions
            WHERE
                project_id = %(project_id)s AND user_id IN %(user_id)s;""",
            {"project_id": project_id, "user_id": tuple(user_ids)}
        )
        ids = cur.execute(query=query)
    return ids


def delete_sessions_by_session_ids(session_ids):
    with pg_client.PostgresClient(long_query=True) as cur:
        query = cur.mogrify(
            """\
            DELETE FROM public.sessions
            WHERE
                session_id IN %(session_ids)s;""",
            {"session_ids": tuple(session_ids)}
        )
        cur.execute(query=query)

    return True


def delete_sessions_by_user_ids(project_id, user_ids):
    with pg_client.PostgresClient(long_query=True) as cur:
        query = cur.mogrify(
            """\
            DELETE FROM public.sessions
            WHERE
                project_id = %(project_id)s AND user_id IN %(user_id)s;""",
            {"project_id": project_id, "user_id": tuple(user_ids)}
        )
        cur.execute(query=query)

    return True


def count_all():
    with pg_client.PostgresClient(long_query=True) as cur:
        row = cur.execute(query="SELECT COUNT(session_id) AS count FROM public.sessions")
    return row.get("count", 0)
