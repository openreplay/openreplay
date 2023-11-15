import json

import schemas
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def create(project_id, user_id, data: schemas.SavedSearchSchema):
    with pg_client.PostgresClient() as cur:
        data = data.model_dump()
        data["filter"] = json.dumps(data["filter"])
        query = cur.mogrify("""\
            INSERT INTO public.searches (project_id, user_id, name, filter,is_public) 
            VALUES (%(project_id)s, %(user_id)s, %(name)s, %(filter)s::jsonb,%(is_public)s)
            RETURNING *;""", {"user_id": user_id, "project_id": project_id, **data})
        cur.execute(
            query
        )
        r = cur.fetchone()
        r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
        r["filter"] = helper.old_search_payload_to_flat(r["filter"])
        r = helper.dict_to_camel_case(r)
        return {"data": r}


def update(search_id, project_id, user_id, data: schemas.SavedSearchSchema):
    with pg_client.PostgresClient() as cur:
        data = data.model_dump()
        data["filter"] = json.dumps(data["filter"])
        query = cur.mogrify(f"""\
            UPDATE public.searches 
            SET name = %(name)s,
                filter = %(filter)s,
                is_public = %(is_public)s
            WHERE search_id=%(search_id)s 
                AND project_id= %(project_id)s
                AND (user_id = %(user_id)s OR is_public)
            RETURNING *;""", {"search_id": search_id, "project_id": project_id, "user_id": user_id, **data})
        cur.execute(
            query
        )
        r = cur.fetchone()
        r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
        r["filter"] = helper.old_search_payload_to_flat(r["filter"])
        r = helper.dict_to_camel_case(r)
        return r


def get_all(project_id, user_id, details=False):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""\
                SELECT search_id, project_id, user_id, name, created_at, deleted_at, is_public
                    {",filter" if details else ""}
                FROM public.searches
                WHERE project_id = %(project_id)s
                  AND deleted_at IS NULL
                  AND (user_id = %(user_id)s OR is_public);""",
                {"project_id": project_id, "user_id": user_id}
            )
        )

        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        for row in rows:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
            if details:
                if isinstance(row["filter"], list) and len(row["filter"]) == 0:
                    row["filter"] = {}
                row["filter"] = helper.old_search_payload_to_flat(row["filter"])
    return rows


def delete(project_id, search_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.searches 
            SET deleted_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND search_id = %(search_id)s
              AND (user_id = %(user_id)s OR is_public);""",
                        {"search_id": search_id, "project_id": project_id, "user_id": user_id})
        )

    return {"state": "success"}


def get(search_id, project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT
                      *
                    FROM public.searches
                    WHERE project_id = %(project_id)s
                      AND deleted_at IS NULL
                      AND search_id = %(search_id)s
                      AND (user_id = %(user_id)s OR is_public);""",
                {"search_id": search_id, "project_id": project_id, "user_id": user_id}
            )
        )

        f = helper.dict_to_camel_case(cur.fetchone())
    if f is None:
        return None

    f["createdAt"] = TimeUTC.datetime_to_timestamp(f["createdAt"])
    f["filter"] = helper.old_search_payload_to_flat(f["filter"])
    return f
