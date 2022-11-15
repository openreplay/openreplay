from decouple import config

import schemas_ee
from chalicelib.utils import s3, pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def presign_records(project_id, data: schemas_ee.AssistRecordUploadPayloadSchema, context: schemas_ee.CurrentContext):
    results = []
    params = {"user_id": context.user_id, "project_id": project_id}

    for i, r in enumerate(data.records):
        key = f"{TimeUTC.now() + i}-{r.name}"
        results.append(s3.get_presigned_url_for_upload(bucket=config('ASSIST_RECORDS_BUCKET'),
                                                       expires_in=1800,
                                                       key=s3.generate_file_key(project_id=project_id, key=key)))
        params[f"name_{i}"] = r.name
        params[f"duration_{i}"] = r.duration
        params[f"session_id_{i}"] = r.session_id
        params[f"key_{i}"] = key
    with pg_client.PostgresClient() as cur:
        values = [f"(%(project_id)s, %(user_id)s, %(name_{i})s, %(key_{i})s, %(duration_{i})s, %(session_id_{i})s)"
                  for i in range(len(data.records))]
        query = cur.mogrify(f"""INSERT INTO assist_records(project_id, user_id, name, file_key, duration, session_id)
                                VALUES {",".join(values)}""", params)
        cur.execute(query)
    return results
