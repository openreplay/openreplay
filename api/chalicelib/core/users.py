import json
import secrets

from decouple import config
from fastapi import BackgroundTasks

import schemas
from chalicelib.core import authorizers, metadata, projects
from chalicelib.core import tenants, assist
from chalicelib.utils import email_helper, smtp
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def __generate_invitation_token():
    return secrets.token_urlsafe(64)


async def get_user_settings(user_id):
    #     read user settings from users.settings:jsonb column
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        settings
                    FROM public.users 
                    WHERE users.deleted_at IS NULL 
                        AND users.user_id=%(user_id)s
                    LIMIT 1""",
                {"user_id": user_id})
        )
        out = await cur.fetchone()
        return helper.dict_to_camel_case(out)


async def update_user_module(user_id, data: schemas.ModuleStatus):
    # example data = {"settings": {"modules": ['ASSIST', 'METADATA']}
    #     update user settings from users.settings:jsonb column only update settings.modules
    #   if module property is not exists, it will be created
    #  if module property exists, it will be updated, modify here and call update_user_settings
    # module is a single element to be added or removed
    settings = get_user_settings(user_id)["settings"]
    if settings is None:
        settings = {}

    if settings.get("modules") is None:
        settings["modules"] = []

    if data.status and data.module not in settings["modules"]:
        settings["modules"].append(data.module)

    elif not data.status and data.module in settings["modules"]:
        settings["modules"].remove(data.module)

    return await update_user_settings(user_id, settings)


async def update_user_settings(user_id, settings):
    #     update user settings from users.settings:jsonb column
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""UPDATE public.users
                    SET settings = %(settings)s
                    WHERE users.user_id = %(user_id)s
                            AND deleted_at IS NULL
                    RETURNING settings;""",
                {"user_id": user_id, "settings": json.dumps(settings)})
        )
        out = await cur.fetchone()
        return helper.dict_to_camel_case(out)


async def create_new_member(email, invitation_token, admin, name, owner=False):
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    WITH u AS (INSERT INTO public.users (email, role, name, data)
                                VALUES (%(email)s, %(role)s, %(name)s, %(data)s)
                                RETURNING user_id,email,role,name,created_at
                            ),
                     au AS (INSERT INTO public.basic_authentication (user_id, invitation_token, invited_at)
                             VALUES ((SELECT user_id FROM u), %(invitation_token)s, timezone('utc'::text, now()))
                             RETURNING invitation_token
                            )
                    SELECT u.user_id,
                           u.email,
                           u.role,
                           u.name,
                           u.created_at,
                           (CASE WHEN u.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                           (CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                           (CASE WHEN u.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                            au.invitation_token
                    FROM u,au;""",
                            {"email": email, "role": "owner" if owner else "admin" if admin else "member", "name": name,
                             "data": json.dumps({"lastAnnouncementView": TimeUTC.now()}),
                             "invitation_token": invitation_token})
        await cur.execute(query)
        row = await cur.fetchone()
        row = helper.dict_to_camel_case(row)
        if row:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
        return row


async def restore_member(user_id, email, invitation_token, admin, name, owner=False):
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    WITH ua AS (UPDATE public.basic_authentication
                                SET invitation_token = %(invitation_token)s,
                                    invited_at = timezone('utc'::text, now()),
                                    change_pwd_expire_at = NULL,
                                    change_pwd_token = NULL
                                WHERE user_id=%(user_id)s
                                RETURNING invitation_token)
                    UPDATE public.users
                    SET name= %(name)s,
                        role = %(role)s,
                        deleted_at= NULL,
                        created_at = timezone('utc'::text, now()),
                        api_key= generate_api_key(20)
                    WHERE user_id=%(user_id)s
                    RETURNING 
                           user_id,
                           email,
                           role,
                           name,
                           (CASE WHEN role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                           (CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                           (CASE WHEN role = 'member' THEN TRUE ELSE FALSE END) AS member,
                           created_at,
                           (SELECT invitation_token FROM ua) AS invitation_token;""",
                            {"user_id": user_id, "email": email,
                             "role": "owner" if owner else "admin" if admin else "member",
                             "name": name, "invitation_token": invitation_token})
        await cur.execute(query)
        result = await cur.fetchone()
        await cur.execute(query)
        result["created_at"] = TimeUTC.datetime_to_timestamp(result["created_at"])
    return helper.dict_to_camel_case(result)


async def generate_new_invitation(user_id):
    invitation_token = __generate_invitation_token()
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                        UPDATE public.basic_authentication
                        SET invitation_token = %(invitation_token)s,
                            invited_at = timezone('utc'::text, now()),
                            change_pwd_expire_at = NULL,
                            change_pwd_token = NULL
                        WHERE user_id=%(user_id)s
                        RETURNING invitation_token;""",
                            {"user_id": user_id, "invitation_token": invitation_token})
        await cur.execute(
            query
        )
        row = await cur.fetchone()
        return __get_invitation_link(row.pop("invitation_token"))


await def reset_member(tenant_id, editor_id, user_id_to_update):
    admin = await get(tenant_id=tenant_id, user_id=editor_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    user = await get(tenant_id=tenant_id, user_id=user_id_to_update)
    if not user:
        return {"errors": ["user not found"]}
    return {"data": {"invitationLink": generate_new_invitation(user_id_to_update)}}


async def update(tenant_id, user_id, changes, output=True):
    AUTH_KEYS = ["password", "invitationToken", "invitedAt", "changePwdExpireAt", "changePwdToken"]
    if len(changes.keys()) == 0:
        return None

    sub_query_users = []
    sub_query_bauth = []
    for key in changes.keys():
        if key in AUTH_KEYS:
            if key == "password":
                sub_query_bauth.append("password = crypt(%(password)s, gen_salt('bf', 12))")
                sub_query_bauth.append("changed_at = timezone('utc'::text, now())")
            else:
                sub_query_bauth.append(f"{helper.key_to_snake_case(key)} = %({key})s")
        else:
            sub_query_users.append(f"{helper.key_to_snake_case(key)} = %({key})s")

    async with pg_client.PostgresClient() as cur:
        if len(sub_query_users) > 0:
            await cur.execute(
                cur.mogrify(f"""\
                            UPDATE public.users
                            SET {" ,".join(sub_query_users)}
                            FROM public.basic_authentication
                            WHERE users.user_id = %(user_id)s
                              AND users.user_id = basic_authentication.user_id
                            RETURNING users.user_id,
                                users.email,
                                users.role,
                                users.name,
                                (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END) AS super_admin,
                                (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END) AS admin,
                                (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member;""",
                            {"user_id": user_id, **changes})
            )
        if len(sub_query_bauth) > 0:
            await cur.execute(
                cur.mogrify(f"""\
                            UPDATE public.basic_authentication
                            SET {" ,".join(sub_query_bauth)}
                            FROM public.users AS users
                            WHERE basic_authentication.user_id = %(user_id)s
                              AND users.user_id = basic_authentication.user_id
                            RETURNING users.user_id,
                                users.email,
                                users.role,
                                users.name,
                                (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END) AS super_admin,
                                (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END) AS admin,
                                (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member;""",
                            {"user_id": user_id, **changes})
            )
    if not output:
        return None
    return get(user_id=user_id, tenant_id=tenant_id)


async def create_member(tenant_id, user_id, data: schemas.CreateMemberSchema, background_tasks: BackgroundTasks):
    admin = await get(tenant_id=tenant_id, user_id=user_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    if data.user_id is not None:
        return {"errors": ["please use POST/PUT /client/members/{memberId} for update"]}
    user = await get_by_email_only(email=data.email)
    if user:
        return {"errors": ["user already exists"]}

    if data.name is None or len(data.name) == 0:
        data.name = data.email
    invitation_token = __generate_invitation_token()
    user = await get_deleted_user_by_email(email=data.email)
    if user is not None:
        new_member = await restore_member(email=data.email, invitation_token=invitation_token,
                                    admin=data.admin, name=data.name, user_id=user["userId"])
    else:
        new_member = await create_new_member(email=data.email, invitation_token=invitation_token,
                                       admin=data.admin, name=data.name)
    new_member["invitationLink"] = __get_invitation_link(new_member.pop("invitationToken"))
    background_tasks.add_task(email_helper.send_team_invitation, **{
        "recipient": data.email,
        "invitation_link": new_member["invitationLink"],
        "client_id": tenants.get_by_tenant_id(tenant_id)["name"],
        "sender_name": admin["name"]
    })
    return {"data": new_member}


def __get_invitation_link(invitation_token):
    return config("SITE_URL") + config("invitation_link") % invitation_token


async def allow_password_change(user_id, delta_min=10):
    pass_token = secrets.token_urlsafe(8)
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.basic_authentication 
                                SET change_pwd_expire_at =  timezone('utc'::text, now()+INTERVAL '%(delta)s MINUTES'),
                                    change_pwd_token = %(pass_token)s
                                WHERE user_id = %(user_id)s""",
                            {"user_id": user_id, "delta": delta_min, "pass_token": pass_token})
        await cur.execute(
            query
        )
    return pass_token


async def get(user_id, tenant_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        email, 
                        role, 
                        name,
                        (CASE WHEN role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        TRUE AS has_password,
                        settings
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id  
                    WHERE
                     users.user_id = %(userId)s
                     AND deleted_at IS NULL
                    LIMIT 1;""",
                {"userId": user_id})
        )
        r = await cur.fetchone()
        return helper.dict_to_camel_case(r)


async def generate_new_api_key(user_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""UPDATE public.users
                    SET api_key=generate_api_key(20)
                    WHERE users.user_id = %(userId)s
                            AND deleted_at IS NULL
                    RETURNING api_key;""",
                {"userId": user_id})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(r)


async def __get_account_info(tenant_id, user_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT users.name, 
                           tenants.name AS tenant_name, 
                           tenants.opt_out
                    FROM public.users INNER JOIN public.tenants ON(TRUE)
                    WHERE users.user_id = %(userId)s
                        AND users.deleted_at IS NULL;""",
                {"tenantId": tenant_id, "userId": user_id})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(r)


async def edit_account(user_id, tenant_id, changes: schemas.EditAccountSchema):
    if changes.opt_out is not None or changes.tenantName is not None and len(changes.tenantName) > 0:
        user = await get(user_id=user_id, tenant_id=tenant_id)
        if not user["superAdmin"] and not user["admin"]:
            return {"errors": ["unauthorized"]}

    if changes.name is not None and len(changes.name) > 0:
        await update(tenant_id=tenant_id, user_id=user_id, changes={"name": changes.name})

    _tenant_changes = {}
    if changes.tenantName is not None and len(changes.tenantName) > 0:
        _tenant_changes["name"] = changes.tenantName

    if changes.opt_out is not None:
        _tenant_changes["opt_out"] = changes.opt_out
    if len(_tenant_changes.keys()) > 0:
        await tenants.edit_tenant(tenant_id=tenant_id, changes=_tenant_changes)

    return {"data": await __get_account_info(tenant_id=tenant_id, user_id=user_id)}


async def edit_member(user_id_to_update, tenant_id, changes: schemas.EditMemberSchema, editor_id):
    user = await get_member(user_id=user_id_to_update, tenant_id=tenant_id)
    _changes = {}
    if editor_id != user_id_to_update:
        admin = await get_user_role(tenant_id=tenant_id, user_id=editor_id)
        if not admin["superAdmin"] and not admin["admin"]:
            return {"errors": ["unauthorized"]}
        if admin["admin"] and user["superAdmin"]:
            return {"errors": ["only the owner can edit his own details"]}
    else:
        if user["superAdmin"]:
            changes.admin = None
        elif changes.admin != user["admin"]:
            return {"errors": ["cannot change your own admin privileges"]}

    if changes.name and len(changes.name) > 0:
        _changes["name"] = changes.name

    if changes.admin is not None:
        _changes["role"] = "admin" if changes.admin else "member"

    if len(_changes.keys()) > 0:
        await update(tenant_id=tenant_id, user_id=user_id_to_update, changes=_changes, output=False)
        return {"data": await get_member(user_id=user_id_to_update, tenant_id=tenant_id)}
    return {"data": user}


async def get_by_email_only(email):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        1 AS tenant_id,
                        users.email, 
                        users.role, 
                        users.name,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        TRUE AS has_password
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id
                    WHERE users.email = %(email)s                     
                     AND users.deleted_at IS NULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(r)


async def get_member(tenant_id, user_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        basic_authentication.password IS NOT NULL AS joined,
                        invitation_token
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id 
                    WHERE users.deleted_at IS NULL AND users.user_id=%(user_id)s
                    ORDER BY name, user_id""",
                {"user_id": user_id})
        )
        r = await cur.fetchone()
        u = helper.dict_to_camel_case(r)
        if u:
            u["createdAt"] = TimeUTC.datetime_to_timestamp(u["createdAt"])
            if u["invitationToken"]:
                u["invitationLink"] = __get_invitation_link(u.pop("invitationToken"))
            else:
                u["invitationLink"] = None

    return u


async def get_members(tenant_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        basic_authentication.password IS NOT NULL AS joined,
                        invitation_token
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id 
                    WHERE users.deleted_at IS NULL
                    ORDER BY name, user_id"""
        )
        r = await cur.fetchall()
        if len(r):
            r = helper.list_to_camel_case(r)
            for u in r:
                u["createdAt"] = TimeUTC.datetime_to_timestamp(u["createdAt"])
                if u["invitationToken"]:
                    u["invitationLink"] = __get_invitation_link(u.pop("invitationToken"))
                else:
                    u["invitationLink"] = None
            return r

    return []


async def delete_member(user_id, tenant_id, id_to_delete):
    if user_id == id_to_delete:
        return {"errors": ["unauthorized, cannot delete self"]}

    admin = await get(user_id=user_id, tenant_id=tenant_id)
    if admin["member"]:
        return {"errors": ["unauthorized"]}

    to_delete = await get(user_id=id_to_delete, tenant_id=tenant_id)
    if to_delete is None:
        return {"errors": ["not found"]}

    if to_delete["superAdmin"]:
        return {"errors": ["cannot delete super admin"]}

    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(f"""UPDATE public.users
                           SET deleted_at = timezone('utc'::text, now()) 
                           WHERE user_id=%(user_id)s;""",
                        {"user_id": id_to_delete}))
        await cur.execute(
            cur.mogrify(f"""UPDATE public.basic_authentication
                           SET password= NULL
                           WHERE user_id=%(user_id)s;""",
                        {"user_id": id_to_delete}))
    return {"data": get_members(tenant_id=tenant_id)}


async def change_password(tenant_id, user_id, email, old_password, new_password):
    item = await get(tenant_id=tenant_id, user_id=user_id)
    if item is None:
        return {"errors": ["access denied"]}
    if old_password == new_password:
        return {"errors": ["old and new password are the same"]}
    auth = await authenticate(email, old_password, for_change_password=True)
    if auth is None:
        return {"errors": ["wrong password"]}
    changes = {"password": new_password}
    user = await update(tenant_id=tenant_id, user_id=user_id, changes=changes)
    r = await authenticate(user['email'], new_password)

    return {
        'jwt': r.pop('jwt')
    }


async def set_password_invitation(user_id, new_password):
    changes = {"password": new_password,
               "invitationToken": None, "invitedAt": None,
               "changePwdExpireAt": None, "changePwdToken": None}
    user = await update(tenant_id=-1, user_id=user_id, changes=changes)
    r = await authenticate(user['email'], new_password)

    tenant_id = r.pop("tenantId")
    r["limits"] = {
        "teamMember": -1,
        "projects": -1,
        "metadata": await metadata.get_remaining_metadata_with_count(tenant_id)}

    c = await tenants.get_by_tenant_id(tenant_id)
    c.pop("createdAt")
    c["projects"] = await projects.get_projects(tenant_id=tenant_id, recorded=True)
    c["smtp"] = smtp.has_smtp()
    c["iceServers"] = assist.get_ice_servers()
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c
        }
    }


async def email_exists(email):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        count(user_id)                        
                    FROM public.users
                    WHERE
                     email = %(email)s
                     AND deleted_at IS NULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = await cur.fetchone()
    return r["count"] > 0


async def get_deleted_user_by_email(email):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        *                        
                    FROM public.users
                    WHERE
                     email = %(email)s
                     AND deleted_at NOTNULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(r)


async def get_by_invitation_token(token, pass_token=None):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        *,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        change_pwd_expire_at <= timezone('utc'::text, now()) AS expired_change,
                        (EXTRACT(EPOCH FROM current_timestamp-basic_authentication.change_pwd_expire_at))::BIGINT AS change_pwd_age
                    FROM public.users INNER JOIN public.basic_authentication USING(user_id)
                    WHERE invitation_token = %(token)s {"AND change_pwd_token = %(pass_token)s" if pass_token else ""}
                    LIMIT 1;""",
                {"token": token, "pass_token": pass_token})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(r)


async def auth_exists(user_id, jwt_iat):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(f"""SELECT user_id, EXTRACT(epoch FROM jwt_iat)::BIGINT AS jwt_iat 
                            FROM public.users  
                            WHERE user_id = %(userId)s 
                                AND deleted_at IS NULL
                            LIMIT 1;""",
                        {"userId": user_id})
        )
        r = await cur.fetchone()
    return r is not None \
        and r.get("jwt_iat") is not None \
        and abs(jwt_iat - r["jwt_iat"]) <= 1


async def refresh_auth_exists(user_id, jwt_jti=None):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(f"""SELECT user_id 
                            FROM public.users  
                            WHERE user_id = %(userId)s 
                                AND deleted_at IS NULL
                                AND jwt_refresh_jti = %(jwt_jti)s
                            LIMIT 1;""",
                        {"userId": user_id, "jwt_jti": jwt_jti})
        )
        r = await cur.fetchone()
    return r is not None


async def change_jwt_iat_jti(user_id):
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.users
                                SET jwt_iat = timezone('utc'::text, now()-INTERVAL '2s'),
                                    jwt_refresh_jti = 0, 
                                    jwt_refresh_iat = timezone('utc'::text, now()-INTERVAL '2s') 
                                WHERE user_id = %(user_id)s 
                                RETURNING EXTRACT (epoch FROM jwt_iat)::BIGINT AS jwt_iat, 
                                          jwt_refresh_jti, 
                                          EXTRACT (epoch FROM jwt_refresh_iat)::BIGINT AS jwt_refresh_iat;""",
                            {"user_id": user_id})
        await cur.execute(query)
        row = await cur.fetchone()
        return row.get("jwt_iat"), row.get("jwt_refresh_jti"), row.get("jwt_refresh_iat")


async def refresh_jwt_iat_jti(user_id):
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.users
                                SET jwt_iat = timezone('utc'::text, now()-INTERVAL '2s'),
                                    jwt_refresh_jti = jwt_refresh_jti + 1 
                                WHERE user_id = %(user_id)s 
                                RETURNING EXTRACT (epoch FROM jwt_iat)::BIGINT AS jwt_iat, 
                                          jwt_refresh_jti, 
                                          EXTRACT (epoch FROM jwt_refresh_iat)::BIGINT AS jwt_refresh_iat""",
                            {"user_id": user_id})
        await cur.execute(query)
        row = await cur.fetchone()
        return row.get("jwt_iat"), row.get("jwt_refresh_jti"), row.get("jwt_refresh_iat")


async def authenticate(email, password, for_change_password=False) -> dict | bool | None:
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT 
                    users.user_id,
                    1 AS tenant_id,
                    users.role,
                    users.name,
                    (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                    (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                    (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                FROM public.users INNER JOIN public.basic_authentication USING(user_id)
                WHERE users.email = %(email)s 
                    AND basic_authentication.password = crypt(%(password)s, basic_authentication.password)
                    AND basic_authentication.user_id = (SELECT su.user_id FROM public.users AS su WHERE su.email=%(email)s AND su.deleted_at IS NULL LIMIT 1)
                LIMIT 1;""",
            {"email": email, "password": password})

        await cur.execute(query)
        r = await cur.fetchone()

    if r is not None:
        if for_change_password:
            return True
        r = helper.dict_to_camel_case(r)
        jwt_iat, jwt_r_jti, jwt_r_iat = change_jwt_iat_jti(user_id=r['userId'])
        return {
            "jwt": authorizers.generate_jwt(user_id=r['userId'], tenant_id=r['tenantId'], iat=jwt_iat,
                                            aud=f"front:{helper.get_stage_name()}"),
            "refreshToken": authorizers.generate_jwt_refresh(user_id=r['userId'], tenant_id=r['tenantId'],
                                                             iat=jwt_r_iat, aud=f"front:{helper.get_stage_name()}",
                                                             jwt_jti=jwt_r_jti),
            "refreshTokenMaxAge": config("JWT_REFRESH_EXPIRATION", cast=int),
            "email": email,
            **r
        }
    return None


async def logout(user_id: int):
    async with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """UPDATE public.users
               SET jwt_iat = NULL, jwt_refresh_jti = NULL, jwt_refresh_iat = NULL
               WHERE user_id = %(user_id)s;""",
            {"user_id": user_id})
        await cur.execute(query)


def refresh(user_id: int, tenant_id: int = -1) -> dict:
    jwt_iat, jwt_r_jti, jwt_r_iat = refresh_jwt_iat_jti(user_id=user_id)
    return {
        "jwt": authorizers.generate_jwt(user_id=user_id, tenant_id=tenant_id, iat=jwt_iat,
                                        aud=f"front:{helper.get_stage_name()}"),
        "refreshToken": authorizers.generate_jwt_refresh(user_id=user_id, tenant_id=tenant_id,
                                                         iat=jwt_r_iat, aud=f"front:{helper.get_stage_name()}",
                                                         jwt_jti=jwt_r_jti),
        "refreshTokenMaxAge": config("JWT_REFRESH_EXPIRATION", cast=int) - (jwt_iat - jwt_r_iat)
    }


async def get_user_role(tenant_id, user_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                    FROM public.users 
                    WHERE users.deleted_at IS NULL 
                        AND users.user_id=%(user_id)s
                    LIMIT 1""",
                {"user_id": user_id})
        )
        w = await cur.fetchone()
        return helper.dict_to_camel_case(w)
