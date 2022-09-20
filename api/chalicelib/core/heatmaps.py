from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def get_by_url(project_id, data):
    args = {"startDate": data.get('startDate', TimeUTC.now(delta_days=-30)),
            "endDate": data.get('endDate', TimeUTC.now()),
            "project_id": project_id, "url": data["url"]}

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT selector, count(1) AS count
                                FROM events.clicks
                                         INNER JOIN sessions USING (session_id)
                                WHERE project_id = %(project_id)s
                                  AND url = %(url)s
                                  AND timestamp >= %(startDate)s
                                  AND timestamp <= %(endDate)s
                                  AND start_ts >= %(startDate)s
                                  AND start_ts <= %(endDate)s
                                  AND duration IS NOT NULL
                                GROUP BY selector;""",
                            args)

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
