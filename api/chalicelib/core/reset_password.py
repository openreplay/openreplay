import chalicelib.utils.TimeUTC
from chalicelib.utils import email_helper, captcha, helper
import secrets
from chalicelib.utils import pg_client

from chalicelib.core import users


def step1(data):
    print("====================== reset password 1 ===============")
    print(data)
    if helper.allow_captcha() and not captcha.is_valid(data["g-recaptcha-response"]):
        print("error: Invalid captcha.")
        return {"errors": ["Invalid captcha."]}
    if "email" not in data:
        return {"errors": ["email not found in body"]}

    a_users = users.get_by_email_only(data["email"])
    if len(a_users) > 1:
        print(f"multiple users found for [{data['email']}] please contact our support")
        return {"errors": ["please contact our support"]}
    elif len(a_users) == 1:
        a_users = a_users[0]
        reset_token = secrets.token_urlsafe(6)
        users.update(tenant_id=a_users["tenantId"], user_id=a_users["id"],
                     changes={"token": reset_token})
        email_helper.send_reset_code(recipient=data["email"], reset_code=reset_token)
    else:
        print(f"invalid email address [{data['email']}]")
        return {"errors": ["invalid email address"]}
    return {"data": {"state": "success"}}


def step2(data):
    print("====================== change password 2 ===============")
    user = users.get_by_email_reset(data["email"], data["code"])
    if not user:
        print("error: wrong email or reset code")
        return {"errors": ["wrong email or reset code"]}
    users.update(tenant_id=user["tenantId"], user_id=user["id"],
                 changes={"token": None, "password": data["password"], "generatedPassword": False})
    return {"data": {"state": "success"}}


def cron():
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                        SELECT user_id
                        FROM public.basic_authentication
                        WHERE token notnull
                          AND (token_requested_at isnull or (EXTRACT(EPOCH FROM token_requested_at)*1000)::BIGINT < %(time)s);""",
                        {"time": chalicelib.utils.TimeUTC.TimeUTC.now(delta_days=-1)})
        )
        results = cur.fetchall()
        if len(results) == 0:
            return
        results = tuple([r["user_id"] for r in results])
        cur.execute(
            cur.mogrify("""\
                                UPDATE public.basic_authentication
                                SET token = NULL, token_requested_at = NULL
                                WHERE user_id in %(ids)s;""",
                        {"ids": results})
        )
