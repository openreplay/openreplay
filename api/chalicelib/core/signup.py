import json
import logging

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
    if await tenants.tenants_exists():
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
        "data": json.dumps({"lastAnnouncementView": TimeUTC.now()}), "organizationName": organization_name
    }
    query = f"""WITH t AS (
                    INSERT INTO public.tenants (name)
                        VALUES (%(organizationName)s)
                    RETURNING api_key
                ),
                 u AS (
                     INSERT INTO public.users (email, role, name, data)
                             VALUES (%(email)s, 'owner', %(fullname)s,%(data)s)
                             RETURNING user_id,email,role,name
                 ),
                 au AS (
                     INSERT INTO public.basic_authentication (user_id, password)
                         VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)))
                 )
                 INSERT INTO public.projects (name, active)
                 VALUES (%(projectName)s, TRUE)
                 RETURNING project_id, (SELECT api_key FROM t) AS api_key;"""

    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(query, params))

    telemetry.new_client()
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
