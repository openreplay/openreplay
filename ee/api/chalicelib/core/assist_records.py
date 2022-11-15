from decouple import config

import schemas_ee
from chalicelib.utils import s3, pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def presign_records(project_id, data: schemas_ee.AssistRecordPayloadSchema, context: schemas_ee.CurrentContext):
    params = {"user_id": context.user_id, "project_id": project_id, **data.dict()}

    key = f"{TimeUTC.now()}-{data.name}"
    presigned_url = s3.get_presigned_url_for_upload(bucket=config('ASSIST_RECORDS_BUCKET'), expires_in=1800,
                                                    key=s3.generate_file_key(project_id=project_id, key=key))
    params["key"] = key
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""INSERT INTO assist_records(project_id, user_id, name, file_key, duration, session_id)
                                VALUES (%(project_id)s, %(user_id)s, %(name)s, %(key)s, 
                                        %(duration)s, %(session_id)s);""",
                            params)
        cur.execute(query)
    return presigned_url
