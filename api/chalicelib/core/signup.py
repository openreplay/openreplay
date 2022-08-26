import json

from decouple import config

import schemas
from chalicelib.core import users, telemetry, tenants
from chalicelib.utils import captcha
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC


def create_step1(data: schemas.UserSignupSchema):
    print(f"===================== SIGNUP STEP 1 AT {TimeUTC.to_human_readable(TimeUTC.now())} UTC")
    errors = []
    if tenants.tenants_exists():
        return {"errors": ["tenants already registered"]}

    email = data.email
    print(f"=====================> {email}")
    password = data.password

    print("Verifying email validity")
    if email is None or len(email) < 5 or not helper.is_valid_email(email):
        errors.append("Invalid email address.")
    else:
        print("Verifying email existance")
        if users.email_exists(email):
            errors.append("Email address already in use.")
        if users.get_deleted_user_by_email(email) is not None:
            errors.append("Email address previously deleted.")

    print("Verifying captcha")
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        errors.append("Invalid captcha.")

    print("Verifying password validity")
    if len(password) < 6:
        errors.append("Password is too short, it must be at least 6 characters long.")

    print("Verifying fullname validity")
    fullname = data.fullname
    if fullname is None or len(fullname) < 1 or not helper.is_alphabet_space_dash(fullname):
        errors.append("Invalid full name.")

    print("Verifying company's name validity")
    company_name = data.organizationName
    if company_name is None or len(company_name) < 1:
        errors.append("invalid organization's name")

    print("Verifying project's name validity")
    project_name = data.projectName
    if project_name is None or len(project_name) < 1:
        project_name = "my first project"

    if len(errors) > 0:
        print("==> error")
        print(errors)
        return {"errors": errors}
    print("No errors detected")
    params = {
        "email": email, "password": password,
        "fullname": fullname,
        "projectName": project_name,
        "data": json.dumps({"lastAnnouncementView": TimeUTC.now()}),
        "organizationName": company_name
    }
    query = f"""\
                WITH t AS (
                    INSERT INTO public.tenants (name, version_number)
                        VALUES (%(organizationName)s, (SELECT openreplay_version()))
                    RETURNING api_key
                ),
                 u AS (
                     INSERT INTO public.users (email, role, name, data)
                             VALUES (%(email)s, 'owner', %(fullname)s,%(data)s)
                             RETURNING user_id,email,role,name
                 ),
                 au AS (INSERT
                     INTO public.basic_authentication (user_id, password)
                         VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)))
                 )
                 INSERT INTO public.projects (name, active)
                 VALUES (%(projectName)s, TRUE)
                 RETURNING project_id, (SELECT api_key FROM t) AS api_key;"""

    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(query, params))
        cur = cur.fetchone()
        project_id = cur["project_id"]
        api_key = cur["api_key"]
    telemetry.new_client()
    created_at = TimeUTC.now()
    r = users.authenticate(email, password)
    r["banner"] = False
    r["limits"] = {
        "teamMember": {"limit": 99, "remaining": 98, "count": 1},
        "projects": {"limit": 99, "remaining": 98, "count": 1},
        "metadata": [{
            "projectId": project_id,
            "name": project_name,
            "limit": 10,
            "remaining": 10,
            "count": 0
        }]
    }
    c = {
        "tenantId": 1,
        "name": company_name,
        "apiKey": api_key,
        "remainingTrial": 14,
        "trialEnded": False,
        "billingPeriodStartDate": created_at,
        "hasActivePlan": True,
        "projects": [
            {
                "projectId": project_id,
                "name": project_name,
                "recorded": False,
                "stackIntegrations": False,
                "status": "red"
            }
        ]
    }
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c,
        }
    }
