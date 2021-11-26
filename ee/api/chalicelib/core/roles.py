from chalicelib.core import users
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def update(tenant_id, user_id, role_id, changes):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}

    if len(changes.keys()) == 0:
        return None
    ALLOW_EDIT = ["name", "description", "permissions"]
    sub_query = []
    for key in changes.keys():
        if key in ALLOW_EDIT:
            sub_query.append(f"{helper.key_to_snake_case(key)} = %({key})s")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                            UPDATE public.roles 
                            SET {" ,".join(sub_query)} 
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND deleted_at ISNULL
                                AND protected = FALSE
                            RETURNING *;""",
                        {"tenant_id": tenant_id, "role_id": role_id, **changes})
        )
        row = cur.fetchone()
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    return helper.dict_to_camel_case(row)


def create(tenant_id, user_id, name, description, permissions):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}

    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""INSERT INTO roles(tenant_id, name, description, permissions)
                           VALUES (%(tenant_id)s, %(name)s, %(description)s, %(permissions)s::text[])
                           RETURNING *;""",
                        {"tenant_id": tenant_id, "name": name, "description": description, "permissions": permissions})
        )
        row=cur.fetchone()
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    return helper.dict_to_camel_case(row)


def get_roles(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT *
                    FROM public.roles
                    where tenant_id =%(tenant_id)s
                        AND deleted_at IS NULL
                    ORDER BY role_id;""",
                        {"tenant_id": tenant_id})
        )
        rows = cur.fetchall()
        for r in rows:
            r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
    return helper.list_to_camel_case(rows)


def delete(tenant_id, user_id, role_id):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT 1 
                                    FROM public.roles 
                                    WHERE role_id = %(role_id)s
                                        AND tenant_id = %(tenant_id)s
                                        AND protected = TRUE
                                    LIMIT 1;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
        if cur.fetchone() is not None:
            return {"errors": ["this role is protected"]}
        cur.execute(
            cur.mogrify("""SELECT 1 
                            FROM public.users 
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                            LIMIT 1;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
        if cur.fetchone() is not None:
            return {"errors": ["this role is already attached to other user(s)"]}
        cur.execute(
            cur.mogrify("""UPDATE public.roles 
                            SET deleted_at = timezone('utc'::text, now())
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND protected = FALSE;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
    return get_roles(tenant_id=tenant_id)
