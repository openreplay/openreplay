from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.ee import users, telemetry
from chalicelib.utils import captcha
import json
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import environ


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
    if email is None or len(email) < 5 or not helper.is_valid_email(email):
        errors.append("Invalid email address.")
    else:
        print("Verifying email existance")
        if users.email_exists(email):
            errors.append("Email address already in use.")
        if users.get_deleted_user_by_email(email) is not None:
            errors.append("Email address previously deleted.")

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

    if len(signed_ups) == 0 and data.get("tenantId") is not None \
            or len(signed_ups) > 0 and data.get("tenantId") not in [t['tenantId'] for t in signed_ups]:
        errors.append("Tenant does not exist")
    if len(errors) > 0:
        print("==> error")
        print(errors)
        return {"errors": errors}
    print("No errors detected")
    print("Decomposed infos")
    tenant_id = data.get("tenantId")

    params = {"email": email, "password": password,
              "fullname": fullname, "companyName": company_name,
              "projectName": project_name,
              "versionNumber": environ["version_number"],
              "data": json.dumps({"lastAnnouncementView": TimeUTC.now()})}
    if tenant_id is not None:
        query = """\
                WITH t AS (
                    UPDATE public.tenants
                        SET name = %(companyName)s,
                            version_number = %(versionNumber)s
                    WHERE tenant_id=%(tenant_id)s
                    RETURNING tenant_id, api_key
                ),
                     u AS (
                         UPDATE public.users
                             SET email = %(email)s,
                             name = %(fullname)s,
                             WHERE role ='owner' AND tenant_id=%(tenant_id)s
                             RETURNING user_id,email, role, name
                     )
                     UPDATE public.basic_authentication
                    SET password= crypt(%(password)s, gen_salt('bf', 12))
                    WHERE user_id = (SELECT user_id FROM u)
                    RETURNING %(tenant_id)s AS tenant_id"""
    else:
        query = """\
                WITH t AS (
                    INSERT INTO public.tenants (name, version_number, edition)
                        VALUES (%(companyName)s, %(versionNumber)s, 'ee')
                        RETURNING tenant_id, api_key
                ),
                     u AS (
                         INSERT INTO public.users (tenant_id, email, role, name, data)
                             VALUES ((SELECT tenant_id FROM t), %(email)s, 'owner', %(fullname)s,%(data)s)
                             RETURNING user_id,email,role,name
                     ),
                     au AS (
                        INSERT INTO public.basic_authentication (user_id, password, generated_password)
                             VALUES ((SELECT user_id FROM u), crypt(%(password)s, gen_salt('bf', 12)), FALSE)
                     )
                     INSERT INTO public.projects (tenant_id, name, active)
                     VALUES ((SELECT t.tenant_id FROM t), %(projectName)s, TRUE)
                     RETURNING tenant_id,project_id, (SELECT api_key FROM t) AS api_key;"""

    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(query, params))
        cur = cur.fetchone()
        project_id = cur["project_id"]
        api_key = cur["api_key"]
    telemetry.new_client(tenant_id=data["tenant_id"])
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
