import schemas
from chalicelib.core import users, license
from chalicelib.utils import helper
from chalicelib.utils import pg_client


def get_by_tenant_key(tenant_key):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                       tenants.tenant_id,
                       tenants.name,
                       tenants.api_key,
                       tenants.created_at,
                        '{license.EDITION}' AS edition,
                        openreplay_version() AS version_number,
                        tenants.opt_out,
                        tenants.tenant_key
                    FROM public.tenants
                    WHERE tenants.tenant_key = %(tenant_key)s 
                        AND tenants.deleted_at ISNULL
                    LIMIT 1;""",
                {"tenant_key": tenant_key})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def get_by_tenant_id(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                       tenants.tenant_id,
                       tenants.name,
                       tenants.api_key,
                       tenants.created_at,
                        '{license.EDITION}' AS edition,
                        openreplay_version() AS version_number,
                        tenants.opt_out,
                        tenants.tenant_key
                    FROM public.tenants
                    WHERE tenants.tenant_id = %(tenantId)s 
                        AND tenants.deleted_at ISNULL
                    LIMIT 1;""",
                {"tenantId": tenant_id})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def get_by_api_key(api_key):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                       tenants.tenant_id,
                       tenants.name,
                       tenants.created_at                        
                    FROM public.tenants
                    WHERE tenants.api_key = %(api_key)s 
                        AND tenants.deleted_at ISNULL
                    LIMIT 1;""",
                {"api_key": api_key})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def generate_new_api_key(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""UPDATE public.tenants
                   SET api_key=generate_api_key(20)
                   WHERE tenant_id= %(tenant_id)s AND deleted_at ISNULL
                   RETURNING api_key;""",
                {"tenant_id": tenant_id})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def edit_client(tenant_id, changes):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                            UPDATE public.tenants 
                            SET {", ".join([f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys()])}
                            WHERE tenant_id= %(tenant_id)s AND deleted_at ISNULL
                            RETURNING name, opt_out;""",
                        {"tenantId": tenant_id, **changes})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def update(tenant_id, user_id, data: schemas.UpdateTenantSchema):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized, needs admin or owner"]}
    if data.name is None and data.opt_out is None:
        return {"errors": ["please provide 'name' of 'optOut' attribute for update"]}
    changes = {}
    if data.name is not None and len(data.name) > 0:
        changes["name"] = data.name
    if data.opt_out is not None:
        changes["optOut"] = data.opt_out
    return edit_client(tenant_id=tenant_id, changes=changes)


def tenants_exists():
    with pg_client.PostgresClient() as cur:
        cur.execute(f"SELECT EXISTS(SELECT 1 FROM public.tenants)")
        return cur.fetchone()["exists"]
