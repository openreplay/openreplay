from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.ee import users, telemetry
from chalicelib.utils import captcha
import json
from chalicelib.utils.TimeUTC import TimeUTC


def get_signed_ups():
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"SELECT tenant_id, name FROM public.tenants;")
        cur.execute(
            query
        )
        rows = cur.fetchall()
    return {"data": helper.list_to_camel_case(rows)}


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
    company_name = data.get("companyName")
    if company_name is None or len(company_name) < 1 or not helper.is_alphanumeric_space(company_name):
        errors.append("invalid company's name")

    print("Verifying project's name validity")
    project_name = data.get("projectName")
    if project_name is None or len(project_name) < 1:
        project_name = "my first project"

    if len(errors) > 0:
        print("==> error")
        print(errors)
        return {"errors": errors}
    print("No errors detected")
    print("Decomposed infos")
    tenant_id = data.get("tenantId")
    if tenant_id is not None:
        with pg_client.PostgresClient() as cur:
            print("Starting ACID insert")
            query = cur.mogrify(f"""\
                    WITH t AS (
                        UPDATE public.tenants
                            SET name = %(companyName)s,
                                version_number = %(versionNumber)s,
                                licence =  %(licence)s
                        WHERE tenant_id=%(tenant_id)s
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
                        RETURNING %(tenant_id)s AS tenant_id""",
                                {"email": email, "password": password,
                                 "fullname": fullname, "companyName": company_name,
                                 "projectName": project_name,
                                 "tenant_id": tenant_id})
            cur.execute(
                query
            )
            data = cur.fetchone()
    else:
        with pg_client.PostgresClient() as cur:
            print("Starting ACID insert")
            query = cur.mogrify(f"""\
                    WITH t AS (
                        INSERT INTO public.tenants (name, version_number, licence)
                            VALUES (%(companyName)s, %(versionNumber)s, %(licence)s)
                            RETURNING tenant_id
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
                         RETURNING tenant_id,project_id;""",
                                {"email": email, "password": password,
                                 "fullname": fullname, "companyName": company_name,
                                 "projectName": project_name,
                                 "data": json.dumps({"lastAnnouncementView": TimeUTC.now()})})
            cur.execute(
                query
            )
            data = cur.fetchone()
    telemetry.new_client(tenant_id=data["tenant_id"])
    return {"data": {"state": "success"}}
