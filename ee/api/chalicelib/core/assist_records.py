from decouple import config

import schemas
import schemas_ee
from chalicelib.utils import s3, pg_client, helper
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


def search_records(project_id, data: schemas_ee.AssistRecordSearchPayloadSchema, context: schemas_ee.CurrentContext):
    conditions = ["projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL",
                  "assist_records.created_at>=%(startDate)s",
                  "assist_records.created_at<=%(endDate)s"]
    params = {"tenant_id": context.tenant_id, "project_id": project_id,
              "startDate": data.startDate, "endDate": data.endDate,
              "p_start": (data.page - 1) * data.limit, "p_limit": data.limit,
              **data.dict()}
    if data.user_id is not None:
        conditions.append("assist_records.user_id=%(user_id)s")
    if data.query is not None and len(data.query) > 0:
        conditions.append("(users.name ILIKE %(query)s OR assist_records.name ILIKE %(query)s)")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator._contains)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT record_id, user_id, session_id, assist_records.created_at, 
                                        assist_records.name, duration, users.name AS created_by
                                FROM assist_records
                                         INNER JOIN projects USING (project_id)
                                         LEFT JOIN users USING (user_id)
                                WHERE {" AND ".join(conditions)}
                                ORDER BY assist_records.created_at
                                LIMIT %(p_limit)s OFFSET %(p_start)s;""",
                            params)
        cur.execute(query)
        results = helper.list_to_camel_case(cur.fetchall())
    return results


def get_record(project_id, record_id, context: schemas_ee.CurrentContext):
    conditions = ["projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL",
                  "assist_records.record_id=%(record_id)s"]
    params = {"tenant_id": context.tenant_id, "project_id": project_id, "record_id": record_id}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT record_id, user_id, session_id, assist_records.created_at, 
                                        assist_records.name, duration, users.name AS created_by,
                                        file_key
                                FROM assist_records
                                         INNER JOIN projects USING (project_id)
                                         LEFT JOIN users USING (user_id)
                                WHERE {" AND ".join(conditions)}
                                LIMIT 1;""", params)
        cur.execute(query)
        result = helper.dict_to_camel_case(cur.fetchone())
        if result:
            result["URL"] = s3.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': config("ASSIST_RECORDS_BUCKET"), 'Key': result.pop("fileKey")},
                ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
            )
    return result
