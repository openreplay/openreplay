from chalicelib.utils import pg_client, helper
from chalicelib.utils.storage import StorageClient
from decouple import config


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


def has_test_signals(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT EXISTS(SELECT 1 FROM public.ut_tests_signals
                            WHERE session_id = %(session_id)s) AS has;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        row = cur.fetchone()
    return row.get("has")


def get_ux_webcam_signed_url(session_id, project_id, check_existence: bool = True):
    results = []
    bucket_name = "uxtesting-records" # config("sessions_bucket")
    k = f'{session_id}/ux_webcam_record.webm'
    if check_existence and not StorageClient.exists(bucket=bucket_name, key=k):
        return []
    results.append(StorageClient.get_presigned_url_for_sharing(
        bucket=bucket_name,
        expires_in=100000,
        key=k
    ))
    return results
