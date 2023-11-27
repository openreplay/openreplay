from chalicelib.utils import pg_client, helper


def get_test_signals(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT *
            FROM public.ut_tests_signals
                     LEFT JOIN public.ut_tests_tasks USING (task_id)
            WHERE session_id = %(session_id)s
            ORDER BY timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows = cur.fetchall()
    return helper.dict_to_camel_case(rows)