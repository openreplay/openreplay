import schemas
from chalicelib.core import sessions
from chalicelib.utils import helper, pg_client


def get_by_url(project_id, data: schemas.GetHeatmapPayloadSchema):
    args = {"startDate": data.startDate, "endDate": data.endDate,
            "project_id": project_id, "url": data.url}
    constraints = ["sessions.project_id = %(project_id)s",
                   "(url = %(url)s OR path= %(url)s)",
                   "clicks.timestamp >= %(startDate)s",
                   "clicks.timestamp <= %(endDate)s",
                   "start_ts >= %(startDate)s",
                   "start_ts <= %(endDate)s",
                   "duration IS NOT NULL"]
    query_from = "events.clicks INNER JOIN sessions USING (session_id)"
    q_count = "count(1) AS count"
    if len(data.filters) > 0:
        for i, f in enumerate(data.filters):
            if f.type == schemas.FilterType.issue and len(f.value) > 0:
                q_count = "max(real_count) AS count"
                query_from += """INNER JOIN events_common.issues USING (timestamp, session_id)
                               INNER JOIN issues AS mis USING (issue_id)
                               INNER JOIN LATERAL (
                                    SELECT COUNT(1) AS real_count
                                     FROM events.clicks AS sc
                                              INNER JOIN sessions as ss USING (session_id)
                                     WHERE ss.project_id = 2
                                       AND (sc.url = %(url)s OR sc.path = %(url)s)
                                       AND sc.timestamp >= %(startDate)s
                                       AND sc.timestamp <= %(endDate)s
                                       AND ss.start_ts >= %(startDate)s
                                       AND ss.start_ts <= %(endDate)s
                                       AND sc.selector = clicks.selector) AS r_clicks ON (TRUE)"""
                constraints += ["mis.project_id = %(project_id)s",
                                "issues.timestamp >= %(startDate)s",
                                "issues.timestamp <= %(endDate)s"]
                f_k = f"issue_value{i}"
                args = {**args, **sessions._multiple_values(f.value, value_key=f_k)}
                constraints.append(sessions._multiple_conditions(f"%({f_k})s = ANY (issue_types)",
                                                                 f.value, value_key=f_k))
                constraints.append(sessions._multiple_conditions(f"mis.type = %({f_k})s",
                                                                 f.value, value_key=f_k))
                if len(f.filters) > 0:
                    for j, sf in enumerate(f.filters):
                        f_k = f"issue_svalue{i}{j}"
                        args = {**args, **sessions._multiple_values(sf.value, value_key=f_k)}
                        if sf.type == schemas.IssueFilterType._on_selector and len(sf.value) > 0:
                            constraints.append(sessions._multiple_conditions(f"clicks.selector = %({f_k})s",
                                                                             sf.value, value_key=f_k))

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT selector, {q_count}
                                FROM {query_from}
                                WHERE {" AND ".join(constraints)}
                                GROUP BY selector;""", args)
        # print("---------")
        # print(query.decode('UTF-8'))
        # print("---------")
        try:
            cur.execute(query)
        except Exception as err:
            print("--------- HEATMAP SEARCH QUERY EXCEPTION -----------")
            print(query.decode('UTF-8'))
            print("--------- PAYLOAD -----------")
            print(data)
            print("--------------------")
            raise err
        rows = cur.fetchall()
    return helper.dict_to_camel_case(rows)
