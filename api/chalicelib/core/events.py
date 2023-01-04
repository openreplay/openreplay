import schemas
from chalicelib.core import issues
from chalicelib.core import metadata
from chalicelib.core import sessions_metas

from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.event_filter_definition import SupportedFilter, Event

from chalicelib.core import autocomplete


def get_customs_by_sessionId2_pg(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT 
                c.*,
                'CUSTOM' AS type
            FROM events_common.customs AS c
            WHERE 
              c.session_id = %(session_id)s
            ORDER BY c.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows = cur.fetchall()
    return helper.dict_to_camel_case(rows)


def __merge_cells(rows, start, count, replacement):
    rows[start] = replacement
    rows = rows[:start + 1] + rows[start + count:]
    return rows


def __get_grouped_clickrage(rows, session_id, project_id):
    click_rage_issues = issues.get_by_session_id(session_id=session_id, issue_type="click_rage", project_id=project_id)
    if len(click_rage_issues) == 0:
        return rows

    for c in click_rage_issues:
        merge_count = c.get("payload")
        if merge_count is not None:
            merge_count = merge_count.get("Count", 3)
        else:
            merge_count = 3
        for i in range(len(rows)):
            if rows[i]["timestamp"] == c["timestamp"]:
                rows = __merge_cells(rows=rows,
                                     start=i,
                                     count=merge_count,
                                     replacement={**rows[i], "type": "CLICKRAGE", "count": merge_count})
                break
    return rows


def get_by_sessionId2_pg(session_id, project_id, group_clickrage=False):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT 
                c.*,
                'CLICK' AS type
            FROM events.clicks AS c
            WHERE 
              c.session_id = %(session_id)s
            ORDER BY c.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows = cur.fetchall()
        if group_clickrage:
            rows = __get_grouped_clickrage(rows=rows, session_id=session_id, project_id=project_id)

        cur.execute(cur.mogrify("""
            SELECT 
                i.*,
                'INPUT' AS type
            FROM events.inputs AS i
            WHERE 
              i.session_id = %(session_id)s
            ORDER BY i.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows += cur.fetchall()
        cur.execute(cur.mogrify("""\
            SELECT 
                l.*,
                l.path AS value,
                l.path AS url,
                'LOCATION' AS type
            FROM events.pages AS l
            WHERE 
              l.session_id = %(session_id)s
            ORDER BY l.timestamp;""", {"project_id": project_id, "session_id": session_id}))
        rows += cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: (k["timestamp"], k["messageId"]))
    return rows


class event_type:
    CLICK = Event(ui_type=schemas.EventType.click, table="events.clicks", column="label")
    INPUT = Event(ui_type=schemas.EventType.input, table="events.inputs", column="label")
    LOCATION = Event(ui_type=schemas.EventType.location, table="events.pages", column="path")
    CUSTOM = Event(ui_type=schemas.EventType.custom, table="events_common.customs", column="name")
    REQUEST = Event(ui_type=schemas.EventType.request, table="events_common.requests", column="path")
    GRAPHQL = Event(ui_type=schemas.EventType.graphql, table="events.graphql", column="name")
    STATEACTION = Event(ui_type=schemas.EventType.state_action, table="events.state_actions", column="name")
    ERROR = Event(ui_type=schemas.EventType.error, table="events.errors",
                  column=None)  # column=None because errors are searched by name or message
    METADATA = Event(ui_type=schemas.FilterType.metadata, table="public.sessions", column=None)
    #     IOS
    CLICK_IOS = Event(ui_type=schemas.EventType.click_ios, table="events_ios.clicks", column="label")
    INPUT_IOS = Event(ui_type=schemas.EventType.input_ios, table="events_ios.inputs", column="label")
    VIEW_IOS = Event(ui_type=schemas.EventType.view_ios, table="events_ios.views", column="name")
    CUSTOM_IOS = Event(ui_type=schemas.EventType.custom_ios, table="events_common.customs", column="name")
    REQUEST_IOS = Event(ui_type=schemas.EventType.request_ios, table="events_common.requests", column="url")
    ERROR_IOS = Event(ui_type=schemas.EventType.error_ios, table="events_ios.crashes",
                      column=None)  # column=None because errors are searched by name or message


SUPPORTED_TYPES = {
    event_type.CLICK.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.CLICK),
                                              query=autocomplete.__generic_query(typename=event_type.CLICK.ui_type)),
    event_type.INPUT.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.INPUT),
                                              query=autocomplete.__generic_query(typename=event_type.INPUT.ui_type)),
    event_type.LOCATION.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.LOCATION),
                                                 query=autocomplete.__generic_query(
                                                     typename=event_type.LOCATION.ui_type)),
    event_type.CUSTOM.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.CUSTOM),
                                               query=autocomplete.__generic_query(typename=event_type.CUSTOM.ui_type)),
    event_type.REQUEST.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.REQUEST),
                                                query=autocomplete.__generic_query(
                                                    typename=event_type.REQUEST.ui_type)),
    event_type.GRAPHQL.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.GRAPHQL),
                                                query=autocomplete.__generic_query(
                                                    typename=event_type.GRAPHQL.ui_type)),
    event_type.STATEACTION.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.STATEACTION),
                                                    query=autocomplete.__generic_query(
                                                        typename=event_type.STATEACTION.ui_type)),
    event_type.ERROR.ui_type: SupportedFilter(get=autocomplete.__search_pg_errors,
                                              query=None),
    event_type.METADATA.ui_type: SupportedFilter(get=autocomplete.__search_pg_metadata,
                                                 query=None),
    #     IOS
    event_type.CLICK_IOS.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.CLICK_IOS),
                                                  query=autocomplete.__generic_query(
                                                      typename=event_type.CLICK_IOS.ui_type)),
    event_type.INPUT_IOS.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.INPUT_IOS),
                                                  query=autocomplete.__generic_query(
                                                      typename=event_type.INPUT_IOS.ui_type)),
    event_type.VIEW_IOS.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.VIEW_IOS),
                                                 query=autocomplete.__generic_query(
                                                     typename=event_type.VIEW_IOS.ui_type)),
    event_type.CUSTOM_IOS.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.CUSTOM_IOS),
                                                   query=autocomplete.__generic_query(
                                                       typename=event_type.CUSTOM_IOS.ui_type)),
    event_type.REQUEST_IOS.ui_type: SupportedFilter(get=autocomplete.__generic_autocomplete(event_type.REQUEST_IOS),
                                                    query=autocomplete.__generic_query(
                                                        typename=event_type.REQUEST_IOS.ui_type)),
    event_type.ERROR_IOS.ui_type: SupportedFilter(get=autocomplete.__search_pg_errors_ios,
                                                  query=None),
}


def get_errors_by_session_id(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""\
                    SELECT er.*,ur.*, er.timestamp - s.start_ts AS time
                    FROM {event_type.ERROR.table} AS er INNER JOIN public.errors AS ur USING (error_id) INNER JOIN public.sessions AS s USING (session_id)
                    WHERE er.session_id = %(session_id)s AND s.project_id=%(project_id)s
                    ORDER BY timestamp;""", {"session_id": session_id, "project_id": project_id}))
        errors = cur.fetchall()
        for e in errors:
            e["stacktrace_parsed_at"] = TimeUTC.datetime_to_timestamp(e["stacktrace_parsed_at"])
        return helper.list_to_camel_case(errors)


def search(text, event_type, project_id, source, key):
    if not event_type:
        return {"data": autocomplete.__get_autocomplete_table(text, project_id)}

    if event_type in SUPPORTED_TYPES.keys():
        rows = SUPPORTED_TYPES[event_type].get(project_id=project_id, value=text, key=key, source=source)
        # for IOS events autocomplete
        # if event_type + "_IOS" in SUPPORTED_TYPES.keys():
        #     rows += SUPPORTED_TYPES[event_type + "_IOS"].get(project_id=project_id, value=text, key=key,
        #                                                      source=source)
    elif event_type + "_IOS" in SUPPORTED_TYPES.keys():
        rows = SUPPORTED_TYPES[event_type + "_IOS"].get(project_id=project_id, value=text, key=key,
                                                        source=source)
    elif event_type in sessions_metas.SUPPORTED_TYPES.keys():
        return sessions_metas.search(text, event_type, project_id)
    elif event_type.endswith("_IOS") \
            and event_type[:-len("_IOS")] in sessions_metas.SUPPORTED_TYPES.keys():
        return sessions_metas.search(text, event_type, project_id)
    else:
        return {"errors": ["unsupported event"]}

    return {"data": rows}
