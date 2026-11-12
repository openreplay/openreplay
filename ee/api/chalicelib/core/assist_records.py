import hashlib

import schemas
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.storage import StorageClient
from chalicelib.utils.storage import extra
from decouple import config


def generate_file_key(project_id, key):
    return f"{project_id}/{hashlib.md5(key.encode()).hexdigest()}"


def presign_record(project_id, data: schemas.AssistRecordPayloadSchema, context: schemas.CurrentContext):
    key = generate_file_key(project_id=project_id, key=f"{TimeUTC.now()}-{data.name}")
    presigned_url = StorageClient.get_presigned_url_for_upload(bucket=config('ASSIST_RECORDS_BUCKET'), expires_in=1800,
                                                               key=key)
    return {"URL": presigned_url, "key": key}


def save_record(project_id, data: schemas.AssistRecordSavePayloadSchema, context: schemas.CurrentContext):
    extra.tag_record(file_key=data.key, tag_value=config('RETENTION_L_VALUE', default='vault'))
    params = {"user_id": context.user_id, "project_id": project_id, **data.model_dump()}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""INSERT INTO assist_records(project_id, user_id, name, file_key, duration, session_id)
                VALUES (%(project_id)s, %(user_id)s, %(name)s, %(key)s,%(duration)s, %(session_id)s)
                RETURNING record_id, user_id, session_id, created_at, name, duration, 
                        (SELECT name FROM users WHERE users.user_id = %(user_id)s LIMIT 1) AS created_by, file_key;""",
            params)
        cur.execute(query)
        result = helper.dict_to_camel_case(cur.fetchone())
        result["URL"] = StorageClient.get_presigned_url_for_sharing(
            bucket=config("ASSIST_RECORDS_BUCKET"), key=result.pop("fileKey"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
        )
    return result


def search_records(project_id: int, data: schemas.AssistRecordSearchPayloadSchema,
                   context: schemas.CurrentContext):
    conditions = ["projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL",
                  "projects.project_id=%(project_id)s",
                  "assist_records.deleted_at ISNULL"]
    if data.startTimestamp:
        conditions.append("assist_records.created_at>=%(startDate)s")
    if data.endTimestamp:
        conditions.append("assist_records.created_at<=%(endDate)s")

    params = {"tenant_id": context.tenant_id, "project_id": project_id,
              "current_user": context.user_id,
              "startDate": data.startTimestamp, "endDate": data.endTimestamp,
              "p_start": (data.page - 1) * data.limit, "p_limit": data.limit,
              **data.model_dump()}
    if data.query is not None and len(data.query) > 0:
        conditions.append("(users.name ILIKE %(query)s OR assist_records.name ILIKE %(query)s)")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator.CONTAINS)
    # the author filter applies to the page only: both counts cover the same window and search
    scope = "WHERE base.user_id=%(user_id)s" if data.user_id is not None else ""
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""WITH base AS (SELECT assist_records.record_id, assist_records.user_id,
                                                     assist_records.session_id, assist_records.created_at,
                                                     assist_records.name, assist_records.duration,
                                                     users.name AS created_by,
                                                     sessions.user_id AS visitor_id,
                                                     sessions.user_anonymous_id AS visitor_anonymous_id,
                                                     sessions.user_uuid AS visitor_uuid
                                              FROM assist_records
                                                   INNER JOIN projects USING (project_id)
                                                   LEFT JOIN users USING (user_id)
                                                   LEFT JOIN sessions
                                                             ON (sessions.session_id = assist_records.session_id)
                                              WHERE {" AND ".join(conditions)}),
                                     counts AS (SELECT COUNT(1) AS count_all,
                                                       COUNT(1) FILTER (WHERE user_id = %(current_user)s) AS count_mine
                                                FROM base),
                                     page AS (SELECT base.*, COUNT(1) OVER () AS total
                                              FROM base
                                              {scope}
                                              ORDER BY base.created_at {data.order}
                                              LIMIT %(p_limit)s OFFSET %(p_start)s)
                                SELECT counts.*, page.*
                                FROM counts
                                     LEFT JOIN page ON (TRUE)
                                ORDER BY page.created_at {data.order};""",
                            params)
        cur.execute(query)
        rows = helper.list_to_camel_case(cur.fetchall())

    head = rows[0]
    results = {"total": head["total"] or 0,
               "counts": {"all": head["countAll"], "mine": head["countMine"]},
               "records": []}
    if head["recordId"] is None:
        return results
    for r in rows:
        for k in ("total", "countAll", "countMine"):
            r.pop(k)
        results["records"].append(r)

    return results


def get_record(project_id, record_id, context: schemas.CurrentContext):
    conditions = ["projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL",
                  "assist_records.record_id=%(record_id)s",
                  "assist_records.deleted_at ISNULL",
                  "assist_records.project_id=%(project_id)s",
                  "projects.project_id=%(project_id)s"]
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
            result["URL"] = StorageClient.get_presigned_url_for_sharing(
                bucket=config("ASSIST_RECORDS_BUCKET"), key=result.pop("fileKey"),
                expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
            )
    return result


def update_record(project_id, record_id, data: schemas.AssistRecordUpdatePayloadSchema,
                  context: schemas.CurrentContext):
    conditions = ["assist_records.record_id=%(record_id)s",
                  "assist_records.deleted_at ISNULL",
                  "assist_records.project_id=%(project_id)s",
                  "projects.project_id=%(project_id)s",
                  "projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL"]
    params = {"tenant_id": context.tenant_id, "project_id": project_id, "record_id": record_id, "name": data.name}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE assist_records
                                SET name= %(name)s
                                FROM (SELECT users.name AS created_by
                                      FROM assist_records INNER JOIN users USING (user_id)
                                      WHERE record_id = %(record_id)s
                                        AND assist_records.deleted_at ISNULL
                                      LIMIT 1) AS users, projects
                                WHERE {" AND ".join(conditions)}
                                RETURNING record_id, user_id, session_id, assist_records.created_at,
                                       assist_records.name, duration, created_by, file_key;""", params)
        cur.execute(query)
        result = helper.dict_to_camel_case(cur.fetchone())
        if not result:
            return {"errors": ["record not found"]}
        result["URL"] = StorageClient.get_presigned_url_for_sharing(
            bucket=config("ASSIST_RECORDS_BUCKET"), key=result.pop("fileKey"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
        )
    return result


def delete_record(project_id, record_id, context: schemas.CurrentContext):
    conditions = ["assist_records.record_id=%(record_id)s",
                  "assist_records.project_id=%(project_id)s",
                  "projects.project_id=%(project_id)s",
                  "projects.tenant_id=%(tenant_id)s",
                  "projects.deleted_at ISNULL"]
    params = {"tenant_id": context.tenant_id, "project_id": project_id, "record_id": record_id}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE assist_records
                                SET deleted_at= (now() at time zone 'utc')
                                FROM projects
                                WHERE {" AND ".join(conditions)}
                                RETURNING file_key;""", params)
        cur.execute(query)
        result = helper.dict_to_camel_case(cur.fetchone())
        if not result:
            return {"errors": ["record not found"]}
        extra.tag_record(file_key=result["fileKey"], tag_value=config('RETENTION_D_VALUE', default='default'))
    return {"state": "success"}
