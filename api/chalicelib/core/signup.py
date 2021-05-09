from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.core import users, telemetry
from chalicelib.utils import captcha
import json
from chalicelib.utils.TimeUTC import TimeUTC


def get_signed_ups():
    with pg_client.PostgresClient() as cur:
        cur.execute("SELECT tenant_id, name FROM public.tenants;")
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def create_step1(data):
    print(f"===================== SIGNUP STEP 1 AT {TimeUTC.to_human_readable(TimeUTC.now())} UTC")
    errors = []

    email = data.get("email")
    print(f"=====================> {email}")
    password = data.get("password")

    print("Verifying email validity")
    email_exists = False
    if email is None or len(email) < 5 or not helper.is_valid_email(email):
        errors.append("Invalid email address.")
    else:
        print("Verifying email existance")
        if users.email_exists(email):
            # errors.append("Email address already in use.")
            email_exists = True
        if users.get_deleted_user_by_email(email) is not None:
            # errors.append("Email address previously deleted.")
            email_exists = True

    print("Verifying captcha")
    if helper.allow_captcha() and not captcha.is_valid(data["g-recaptcha-response"]):
        errors.append("Invalid captcha.")

    print("Verifying password validity")
    if len(data["password"]) < 6:
        errors.append("Password is too short, it must be at least 6 characters long.")

    print("Verifying fullname validity")
    fullname = data.get("fullname")
    if fullname is None or len(fullname) < 1 or not helper.is_alphabet_space_dash(fullname):
        errors.append("Invalid full name.")

    print("Verifying company's name validity")
    company_name = data.get("organizationName")
    if company_name is None or len(company_name) < 1 or not helper.is_alphanumeric_space(company_name):
        errors.append("invalid organization's name")

    print("Verifying project's name validity")
    project_name = data.get("projectName")
    if project_name is None or len(project_name) < 1:
        project_name = "my first project"
    signed_ups = get_signed_ups()
    if len(signed_ups) > 0 and data.get("tenantId") is None:
        errors.append("Tenant already exists, please select it from dropdown")
    elif len(signed_ups) == 0 and data.get("tenantId") is not None \
            or len(signed_ups) > 0 and data.get("tenantId") not in [t['tenantId'] for t in signed_ups]:
        errors.append("Tenant does not exist")

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
        "organizationName": company_name,
        "versionNumber": "0.0.0"
    }
    if data.get("tenantId") is not None:
        update_user = """
                    u AS (
                         UPDATE public.users
                             SET name = %(fullname)s, deleted_at=NULL
                             WHERE email=%(email)s
                             RETURNING user_id,email, role, name
                         )
                    UPDATE public.basic_authentication
                    SET password= crypt(%(password)s, gen_salt('bf', 12))
                    WHERE user_id = (SELECT user_id FROM u)"""
        insert_user = """
                    a AS (
                         UPDATE public.users
                             SET role='admin'
                             WHERE role ='owner'
                         ),
                     u AS (
                         INSERT INTO public.users (email, role, name, data)
                                 VALUES (%(email)s, 'owner', %(fullname)s,%(data)s)
                                 RETURNING user_id,email,role,name
                     )
                     INSERT INTO public.basic_authentication (user_id, password, generated_password)
                             VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)), FALSE)"""
        query = f"""\
                WITH t AS (
                    UPDATE public.tenants
                        SET name = %(organizationName)s,
                            version_number = %(versionNumber)s
                    RETURNING api_key
                ),
                 {update_user if email_exists else insert_user}
                RETURNING (SELECT api_key FROM t) AS api_key,(SELECT project_id FROM projects LIMIT 1) AS project_id;"""
    else:
        query = f"""\
                WITH t AS (
                    INSERT INTO public.tenants (name, version_number, edition)
                        VALUES (%(organizationName)s, %(versionNumber)s, 'fos')
                    RETURNING api_key
                ),
                 u AS (
                     INSERT INTO public.users (email, role, name, data)
                             VALUES (%(email)s, 'owner', %(fullname)s,%(data)s)
                             RETURNING user_id,email,role,name
                 ),
                 au AS (INSERT
                     INTO public.basic_authentication (user_id, password, generated_password)
                         VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)), FALSE)
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
