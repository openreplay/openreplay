from chalicelib.utils import pg_client, helper


def get_all_alerts():
    with pg_client.PostgresClient(long_query=True) as cur:
        query = """SELECT -1 AS tenant_id,
                           alert_id,
                           project_id,
                           detection_method,
                           query,
                           options,
                           (EXTRACT(EPOCH FROM alerts.created_at) * 1000)::BIGINT AS created_at,
                           alerts.name,
                           alerts.series_id,
                           filter,
                           change
                    FROM public.alerts
                             LEFT JOIN metric_series USING (series_id)
                             INNER JOIN projects USING (project_id)
                    WHERE alerts.deleted_at ISNULL
                      AND alerts.active
                      AND projects.active
                      AND projects.deleted_at ISNULL
                      AND (alerts.series_id ISNULL OR metric_series.deleted_at ISNULL)
                    ORDER BY alerts.created_at;"""
        cur.execute(query=query)
        all_alerts = helper.list_to_camel_case(cur.fetchall())
    return all_alerts
