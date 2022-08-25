import json
import secrets

from decouple import config
from fastapi import BackgroundTasks

import schemas
from chalicelib.core import authorizers, metadata, projects
from chalicelib.core import tenants, assist
from chalicelib.utils import dev, email_helper
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def __generate_invitation_token():
    return secrets.token_urlsafe(64)


def create_new_member(email, invitation_token, admin, name, owner=False):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    WITH u AS (INSERT INTO public.users (email, role, name, data)
                                VALUES (%(email)s, %(role)s, %(name)s, %(data)s)
                                RETURNING user_id,email,role,name
                            ),
                     au AS (INSERT INTO public.basic_authentication (user_id, invitation_token, invited_at)
                             VALUES ((SELECT user_id FROM u), %(invitation_token)s, timezone('utc'::text, now()))
                             RETURNING invitation_token
                            )
                    SELECT u.user_id,
                           u.user_id                                              AS id,
                           u.email,
                           u.role,
                           u.name,
                           (CASE WHEN u.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                           (CASE WHEN u.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                           (CASE WHEN u.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                            au.invitation_token
                    FROM u,au;""",
                            {"email": email, "role": "owner" if owner else "admin" if admin else "member", "name": name,
                             "data": json.dumps({"lastAnnouncementView": TimeUTC.now()}),
                             "invitation_token": invitation_token})
        cur.execute(
            query
        )
        return helper.dict_to_camel_case(cur.fetchone())


def restore_member(user_id, email, invitation_token, admin, name, owner=False):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    UPDATE public.users
                    SET name= %(name)s,
                        role = %(role)s,
                        deleted_at= NULL,
                        created_at = timezone('utc'::text, now()),
                        api_key= generate_api_key(20)
                    WHERE user_id=%(user_id)s
                    RETURNING user_id                                           AS id,
                           email,
                           role,
                           name,
                           (CASE WHEN role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                           (CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                           (CASE WHEN role = 'member' THEN TRUE ELSE FALSE END) AS member;""",
                            {"user_id": user_id, "email": email,
                             "role": "owner" if owner else "admin" if admin else "member", "name": name})
        cur.execute(
            query
        )
        result = cur.fetchone()
        query = cur.mogrify("""\
                    UPDATE public.basic_authentication
                    SET invitation_token = %(invitation_token)s,
                        invited_at = timezone('utc'::text, now()),
                        change_pwd_expire_at = NULL,
                        change_pwd_token = NULL
                    WHERE user_id=%(user_id)s
                    RETURNING invitation_token;""",
                            {"user_id": user_id, "invitation_token": invitation_token})
        cur.execute(
            query
        )
        result["invitation_token"] = cur.fetchone()["invitation_token"]

        return helper.dict_to_camel_case(result)


def generate_new_invitation(user_id):
    invitation_token = __generate_invitation_token()
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                        UPDATE public.basic_authentication
                        SET invitation_token = %(invitation_token)s,
                            invited_at = timezone('utc'::text, now()),
                            change_pwd_expire_at = NULL,
                            change_pwd_token = NULL
                        WHERE user_id=%(user_id)s
                        RETURNING invitation_token;""",
                            {"user_id": user_id, "invitation_token": invitation_token})
        cur.execute(
            query
        )
        return __get_invitation_link(cur.fetchone().pop("invitation_token"))


def reset_member(tenant_id, editor_id, user_id_to_update):
    admin = get(tenant_id=tenant_id, user_id=editor_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    user = get(tenant_id=tenant_id, user_id=user_id_to_update)
    if not user:
        return {"errors": ["user not found"]}
    return {"data": {"invitationLink": generate_new_invitation(user_id_to_update)}}


def update(tenant_id, user_id, changes):
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

    with pg_client.PostgresClient() as cur:
        if len(sub_query_users) > 0:
            cur.execute(
                cur.mogrify(f"""\
                            UPDATE public.users
                            SET {" ,".join(sub_query_users)}
                            FROM public.basic_authentication
                            WHERE users.user_id = %(user_id)s
                              AND users.user_id = basic_authentication.user_id
                            RETURNING users.user_id AS id,
                                users.email,
                                users.role,
                                users.name,
                                (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END) AS super_admin,
                                (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END) AS admin,
                                (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member;""",
                            {"user_id": user_id, **changes})
            )
        if len(sub_query_bauth) > 0:
            cur.execute(
                cur.mogrify(f"""\
                            UPDATE public.basic_authentication
                            SET {" ,".join(sub_query_bauth)}
                            FROM public.users AS users
                            WHERE basic_authentication.user_id = %(user_id)s
                              AND users.user_id = basic_authentication.user_id
                            RETURNING users.user_id AS id,
                                users.email,
                                users.role,
                                users.name,
                                (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END) AS super_admin,
                                (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END) AS admin,
                                (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member;""",
                            {"user_id": user_id, **changes})
            )

    return get(user_id=user_id, tenant_id=tenant_id)


def create_member(tenant_id, user_id, data, background_tasks: BackgroundTasks):
    admin = get(tenant_id=tenant_id, user_id=user_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    if data.get("userId") is not None:
        return {"errors": ["please use POST/PUT /client/members/{memberId} for update"]}
    user = get_by_email_only(email=data["email"])
    if user:
        return {"errors": ["user already exists"]}
    name = data.get("name", None)
    if name is not None and len(name) == 0:
        return {"errors": ["invalid user name"]}
    if name is None:
        name = data["email"]
    invitation_token = __generate_invitation_token()
    user = get_deleted_user_by_email(email=data["email"])
    if user is not None:
        new_member = restore_member(email=data["email"], invitation_token=invitation_token,
                                    admin=data.get("admin", False), name=name, user_id=user["userId"])
    else:
        new_member = create_new_member(email=data["email"], invitation_token=invitation_token,
                                       admin=data.get("admin", False), name=name)
    new_member["invitationLink"] = __get_invitation_link(new_member.pop("invitationToken"))

    # helper.async_post(config('email_basic') % 'member_invitation',
    #                   {
    #                       "email": data["email"],
    #                       "invitationLink": new_member["invitationLink"],
    #                       "clientId": tenants.get_by_tenant_id(tenant_id)["name"],
    #                       "senderName": admin["name"]
    #                   })
    background_tasks.add_task(email_helper.send_team_invitation, **{
        "recipient": data["email"],
        "invitation_link": new_member["invitationLink"],
        "client_id": tenants.get_by_tenant_id(tenant_id)["name"],
        "sender_name": admin["name"]
    })
    return {"data": new_member}


def __get_invitation_link(invitation_token):
    return config("SITE_URL") + config("invitation_link") % invitation_token


def allow_password_change(user_id, delta_min=10):
    pass_token = secrets.token_urlsafe(8)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.basic_authentication 
                                SET change_pwd_expire_at =  timezone('utc'::text, now()+INTERVAL '%(delta)s MINUTES'),
                                    change_pwd_token = %(pass_token)s
                                WHERE user_id = %(user_id)s""",
                            {"user_id": user_id, "delta": delta_min, "pass_token": pass_token})
        cur.execute(
            query
        )
    return pass_token


def get(user_id, tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        email, 
                        role, 
                        name,
                        (CASE WHEN role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        TRUE AS has_password
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id  
                    WHERE
                     users.user_id = %(userId)s
                     AND deleted_at IS NULL
                    LIMIT 1;""",
                {"userId": user_id})
        )
        r = cur.fetchone()
        return helper.dict_to_camel_case(r)


def generate_new_api_key(user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""UPDATE public.users
                    SET api_key=generate_api_key(20)
                    WHERE
                     users.user_id = %(userId)s
                     AND deleted_at IS NULL
                    RETURNING api_key;""",
                {"userId": user_id})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def edit(user_id_to_update, tenant_id, changes: schemas.EditUserSchema, editor_id):
    user = get(user_id=user_id_to_update, tenant_id=tenant_id)
    if editor_id != user_id_to_update or changes.admin is not None and changes.admin != user["admin"]:
        admin = get(tenant_id=tenant_id, user_id=editor_id)
        if not admin["superAdmin"] and not admin["admin"]:
            return {"errors": ["unauthorized"]}
    _changes = {}
    if editor_id == user_id_to_update:
        if changes.admin is not None:
            if user["superAdmin"]:
                changes.admin = None
            elif changes.admin != user["admin"]:
                return {"errors": ["cannot change your own role"]}

    if changes.email is not None and changes.email != user["email"]:
        if email_exists(changes.email):
            return {"errors": ["email already exists."]}
        if get_deleted_user_by_email(changes.email) is not None:
            return {"errors": ["email previously deleted."]}
        _changes["email"] = changes.email

    if changes.name is not None and len(changes.name) > 0:
        _changes["name"] = changes.name

    if changes.admin is not None:
        _changes["role"] = "admin" if changes.admin else "member"

    if len(_changes.keys()) > 0:
        updated_user = update(tenant_id=tenant_id, user_id=user_id_to_update, changes=_changes)
        return {"data": updated_user}
    return {"data": user}


def get_by_email_only(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id AS id,
                        1 AS tenant_id,
                        users.email, 
                        users.role, 
                        users.name,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id
                    WHERE
                     users.email = %(email)s                     
                     AND users.deleted_at IS NULL;""",
                {"email": email})
        )
        r = cur.fetchall()
    return helper.list_to_camel_case(r)


def get_by_email_reset(email, reset_token):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id AS id,
                        1 AS tenant_id,
                        users.email, 
                        users.role, 
                        users.name,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id
                    WHERE
                     users.email = %(email)s
                     AND basic_authentication.token =%(token)s                   
                     AND users.deleted_at IS NULL""",
                {"email": email, "token": reset_token})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def get_members(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""SELECT 
                        users.user_id AS id,
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
                    ORDER BY name, id"""
        )
        r = cur.fetchall()
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


def delete_member(user_id, tenant_id, id_to_delete):
    if user_id == id_to_delete:
        return {"errors": ["unauthorized, cannot delete self"]}

    admin = get(user_id=user_id, tenant_id=tenant_id)
    if admin["member"]:
        return {"errors": ["unauthorized"]}

    to_delete = get(user_id=id_to_delete, tenant_id=tenant_id)
    if to_delete is None:
        return {"errors": ["not found"]}

    if to_delete["superAdmin"]:
        return {"errors": ["cannot delete super admin"]}

    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""UPDATE public.users
                           SET deleted_at = timezone('utc'::text, now()) 
                           WHERE user_id=%(user_id)s;""",
                        {"user_id": id_to_delete}))
        cur.execute(
            cur.mogrify(f"""UPDATE public.basic_authentication
                           SET password= NULL
                           WHERE user_id=%(user_id)s;""",
                        {"user_id": id_to_delete}))
    return {"data": get_members(tenant_id=tenant_id)}


def change_password(tenant_id, user_id, email, old_password, new_password):
    item = get(tenant_id=tenant_id, user_id=user_id)
    if item is None:
        return {"errors": ["access denied"]}
    if old_password == new_password:
        return {"errors": ["old and new password are the same"]}
    auth = authenticate(email, old_password, for_change_password=True)
    if auth is None:
        return {"errors": ["wrong password"]}
    changes = {"password": new_password}
    user = update(tenant_id=tenant_id, user_id=user_id, changes=changes)
    r = authenticate(user['email'], new_password)
    tenant_id = r.pop("tenantId")

    r["limits"] = {
        "teamMember": -1,
        "projects": -1,
        "metadata": metadata.get_remaining_metadata_with_count(tenant_id)}

    c = tenants.get_by_tenant_id(tenant_id)
    c.pop("createdAt")
    c["projects"] = projects.get_projects(tenant_id=tenant_id, recording_state=True, recorded=True,
                                          stack_integrations=True)
    c["smtp"] = helper.has_smtp()
    c["iceServers"] = assist.get_ice_servers()
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c
        }
    }


def set_password_invitation(user_id, new_password):
    changes = {"password": new_password,
               "invitationToken": None, "invitedAt": None,
               "changePwdExpireAt": None, "changePwdToken": None}
    user = update(tenant_id=-1, user_id=user_id, changes=changes)
    r = authenticate(user['email'], new_password)
    tenant_id = r.pop("tenantId")

    r["limits"] = {
        "teamMember": -1,
        "projects": -1,
        "metadata": metadata.get_remaining_metadata_with_count(tenant_id)}

    c = tenants.get_by_tenant_id(tenant_id)
    c.pop("createdAt")
    c["projects"] = projects.get_projects(tenant_id=tenant_id, recording_state=True, recorded=True,
                                          stack_integrations=True)
    c["smtp"] = helper.has_smtp()
    c["iceServers"] = assist.get_ice_servers()
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c
        }
    }


def count_members():
    with pg_client.PostgresClient() as cur:
        cur.execute("""SELECT COUNT(user_id) 
                        FROM public.users WHERE deleted_at IS NULL;""")
        r = cur.fetchone()
    return r["count"]


def email_exists(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
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
        r = cur.fetchone()
    return r["count"] > 0


def get_deleted_user_by_email(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
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
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def get_by_invitation_token(token, pass_token=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
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
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def auth_exists(user_id, tenant_id, jwt_iat, jwt_aud):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"SELECT user_id AS id,jwt_iat, changed_at FROM public.users INNER JOIN public.basic_authentication USING(user_id) WHERE user_id = %(userId)s AND deleted_at IS NULL LIMIT 1;",
                {"userId": user_id})
        )
        r = cur.fetchone()
    return r is not None \
           and r.get("jwt_iat") is not None \
           and (abs(jwt_iat - TimeUTC.datetime_to_timestamp(r["jwt_iat"]) // 1000) <= 1 \
                or (jwt_aud.startswith("plugin") \
                    and (r["changed_at"] is None \
                         or jwt_iat >= (TimeUTC.datetime_to_timestamp(r["changed_at"]) // 1000)))
                )


def authenticate(email, password, for_change_password=False, for_plugin=False):
    with pg_client.PostgresClient() as cur:
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

        cur.execute(query)
        r = cur.fetchone()

        if r is not None:
            if for_change_password:
                return True
            r = helper.dict_to_camel_case(r)
            query = cur.mogrify(
                f"""UPDATE public.users
                   SET jwt_iat = timezone('utc'::text, now())
                   WHERE user_id = %(user_id)s 
                   RETURNING jwt_iat;""",
                {"user_id": r["userId"]})
            cur.execute(query)
            return {
                "jwt": authorizers.generate_jwt(r['userId'], r['tenantId'],
                                                TimeUTC.datetime_to_timestamp(cur.fetchone()["jwt_iat"]),
                                                aud=f"plugin:{helper.get_stage_name()}" if for_plugin else f"front:{helper.get_stage_name()}"),
                "email": email,
                **r
            }
    return None
