import json
import logging

from decouple import config

import schemas
from chalicelib.core import users, telemetry, tenants
from chalicelib.utils import captcha, smtp
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)


async def create_tenant(data: schemas.UserSignupSchema):
    logger.info(f"==== Signup started at {TimeUTC.to_human_readable(TimeUTC.now())} UTC")
    errors = []
    if not config("MULTI_TENANTS", cast=bool, default=False) and await tenants.tenants_exists():
        return {"errors": ["tenants already registered"]}

    email = data.email
    logger.debug(f"email: {email}")
    password = data.password.get_secret_value()

    if email is None or len(email) < 5:
        errors.append("Invalid email address.")
    else:
        if users.email_exists(email):
            errors.append("Email address already in use.")
        if users.get_deleted_user_by_email(email) is not None:
            errors.append("Email address previously deleted.")

    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        errors.append("Invalid captcha.")

    if len(password) < 6:
        errors.append("Password is too short, it must be at least 6 characters long.")

    fullname = data.fullname
    if fullname is None or len(fullname) < 1 or not helper.is_alphabet_space_dash(fullname):
        errors.append("Invalid full name.")

    organization_name = data.organizationName
    if organization_name is None or len(organization_name) < 1:
        errors.append("Invalid organization name.")

    if len(errors) > 0:
        logger.warning(
            f"==> signup error for:\n email:{data.email}, fullname:{data.fullname}, organizationName:{data.organizationName}")
        logger.warning(errors)
        return {"errors": errors}

    project_name = "my first project"
    params = {
        "email": email, "password": password, "fullname": fullname, "projectName": project_name,
        "data": json.dumps({"lastAnnouncementView": TimeUTC.now()}), "organizationName": organization_name,
        "permissions": [p.value for p in schemas.Permissions]
    }
    query = """WITH t AS (
                INSERT INTO public.tenants (name)
                    VALUES (%(organizationName)s)
                    RETURNING tenant_id, api_key
            ),
                 r AS (
                     INSERT INTO public.roles(tenant_id, name, description, permissions, protected)
                        VALUES ((SELECT tenant_id FROM t), 'Owner', 'Owner', %(permissions)s::text[], TRUE),
                               ((SELECT tenant_id FROM t), 'Member', 'Member', %(permissions)s::text[], FALSE)
                        RETURNING *
                 ),
                 u AS (
                     INSERT INTO public.users (tenant_id, email, role, name, data, role_id)
                         VALUES ((SELECT tenant_id FROM t), %(email)s, 'owner', %(fullname)s,%(data)s, (SELECT role_id FROM r WHERE name ='Owner'))
                         RETURNING user_id,email,role,name,role_id
                 ),
                 au AS (
                    INSERT INTO public.basic_authentication (user_id, password)
                         VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)))
                 )
                 INSERT INTO public.projects (tenant_id, name, active)
                 VALUES ((SELECT t.tenant_id FROM t), %(projectName)s, TRUE)
                 RETURNING tenant_id,project_id, (SELECT api_key FROM t) AS api_key;"""

    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(query, params))
        t = cur.fetchone()

    telemetry.new_client(tenant_id=t["tenant_id"])
    r = users.authenticate(email, password)
    r["smtp"] = smtp.has_smtp()

    return {
        'jwt': r.pop('jwt'),
        'refreshToken': r.pop('refreshToken'),
        'refreshTokenMaxAge': r.pop('refreshTokenMaxAge'),
        'data': {
            "user": r
        }
    }
