from chalicelib.utils import helper, pg_client


def get_series_for_alert(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT series_id AS value,
                       metrics.name || '.' || (COALESCE(metric_series.name, 'series ' || index)) || '.count' AS name,
                       'count' AS unit,
                       FALSE AS predefined,
                       metric_id,
                       series_id
                   FROM metric_series
                       INNER JOIN metrics USING (metric_id)
                   WHERE metrics.deleted_at ISNULL
                     AND metrics.project_id = %(project_id)s
                     AND metrics.metric_type = 'timeseries'
                     AND (user_id = %(user_id)s
                      OR is_public)
                   ORDER BY name;""",
                {"project_id": project_id, "user_id": user_id}
            )
        )
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)
