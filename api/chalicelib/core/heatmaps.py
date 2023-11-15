from chalicelib.utils import sql_helper as sh
import schemas
from chalicelib.utils import helper, pg_client


def get_by_url(project_id, data: schemas.GetHeatmapPayloadSchema):
    args = {"startDate": data.startTimestamp, "endDate": data.endTimestamp,
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
    has_click_rage_filter = False
    if len(data.filters) > 0:
        for i, f in enumerate(data.filters):
            if f.type == schemas.FilterType.issue and len(f.value) > 0:
                has_click_rage_filter = True
                q_count = "max(real_count) AS count,TRUE AS click_rage"
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
                args = {**args, **sh.multi_values(f.value, value_key=f_k)}
                constraints.append(sh.multi_conditions(f"%({f_k})s = ANY (issue_types)",
                                                       f.value, value_key=f_k))
                constraints.append(sh.multi_conditions(f"mis.type = %({f_k})s",
                                                       f.value, value_key=f_k))

    if data.click_rage and not has_click_rage_filter:
        constraints.append("""(issues.session_id IS NULL 
                                OR (issues.timestamp >= %(startDate)s
                                    AND issues.timestamp <= %(endDate)s
                                    AND mis.project_id = %(project_id)s))""")
        q_count += ",COALESCE(bool_or(mis.type = 'click_rage'), FALSE) AS click_rage"
        query_from += """LEFT JOIN events_common.issues USING (timestamp, session_id)
                       LEFT JOIN issues AS mis USING (issue_id)"""
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT selector, {q_count}
                                FROM {query_from}
                                WHERE {" AND ".join(constraints)}
                                GROUP BY selector
                                LIMIT 500;""", args)
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
    return helper.list_to_camel_case(rows)
