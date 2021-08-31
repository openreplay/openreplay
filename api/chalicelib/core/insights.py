from chalicelib.core import metadata
from chalicelib.utils import args_transformer
from chalicelib.utils import helper, dev
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size
import math
from chalicelib.core.dashboard import __get_constraints, __get_constraint_values


def __transform_journey(rows):
    nodes = []
    links = []
    for r in rows:
        source = r["source_event"][r["source_event"].index("_"):]
        target = r["target_event"][r["target_event"].index("_"):]
        if source not in nodes:
            nodes.append(source)
        if target not in nodes:
            nodes.append(target)
        links.append({"source": nodes.index(source), "target": nodes.index(target), "value": r["value"]})
    return {"nodes": nodes, "links": sorted(links, key=lambda x: x["value"], reverse=True)}


@dev.timed
def get_journey(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(), **args):
    pg_sub_query_subset = __get_constraints(project_id=project_id, data=args, duration=True, main_table="sessions",
                                            time_constraint=True)
    # pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False,
    #                                        chart=True, data=args, main_table="events.pages", time_column="timestamp",
    #                                        project=False, duration=False)
    # pg_sub_query_subset.append("m_errors.source = 'js_exception'")
    # pg_sub_query_subset.append("pages.timestamp>=%(startTimestamp)s")
    # pg_sub_query_subset.append("pages.timestamp<%(endTimestamp)s")
    # with pg_client.PostgresClient() as cur:
    #     pg_query = f"""WITH errors AS (SELECT DISTINCT session_id, timestamp
    #                                     FROM events.errors
    #                                              INNER JOIN public.errors AS m_errors USING (error_id)
    #                                     WHERE {" AND ".join(pg_sub_query_subset)}
    #                     )
    #                     SELECT generated_timestamp          AS timestamp,
    #                            COALESCE(COUNT(sessions), 0) AS count
    #                     FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
    #                              LEFT JOIN LATERAL ( SELECT session_id
    #                                                  FROM errors
    #                                                  WHERE {" AND ".join(pg_sub_query_chart)}
    #                         ) AS sessions ON (TRUE)
    #                     GROUP BY generated_timestamp
    #                     ORDER BY generated_timestamp;"""
    #     params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
    #               "endTimestamp": endTimestamp, **__get_constraint_values(args)}

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT source_event,
                               target_event,
                               MAX(target_id)  max_target_id,
                               MAX(source_id) max_source_id,
                               count(*) AS      value
                        
                        FROM (SELECT event_number || '_' || path                                            as target_event,
                                     message_id                                                             as target_id,
                                     LAG(event_number || '_' || path, 1) OVER ( PARTITION BY session_rank ) AS source_event,
                                     LAG(message_id, 1) OVER ( PARTITION BY session_rank )                  AS source_id
                              FROM (SELECT path,
                                           session_rank,
                                           message_id,
                                           ROW_NUMBER() OVER ( PARTITION BY session_rank ORDER BY timestamp ) AS event_number
                                    FROM (SELECT message_id,
                                                 timestamp,
                                                 path,
                                                 SUM(new_session) OVER (ORDER BY session_id, timestamp) AS session_rank
                                          FROM (SELECT *,
                                                       CASE
                                                           WHEN source_timestamp IS NULL THEN 1
                                                           ELSE 0 END AS new_session
                                                FROM (SELECT session_id,
                                                             message_id,
                                                             timestamp,
                                                             path,
                                                             LAG(pages.timestamp)
                                                             OVER (
                                                                 PARTITION BY session_id
                                                                 ORDER BY timestamp) AS source_timestamp
                                                      FROM events.pages
                                                               INNER JOIN public.sessions USING (session_id)
                                                      WHERE {" AND ".join(pg_sub_query_subset)}
                                                     ) AS related_events) AS ranked_events) AS processed) AS sorted_events
                              WHERE event_number <= 4) AS final
                        WHERE source_event IS NOT NULL
                          and target_event IS NOT NULL
                        GROUP BY source_event, target_event
                        ORDER BY value DESC
                        LIMIT 20;"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        print(cur.mogrify(pg_query, params))
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()

    return __transform_journey(rows)
