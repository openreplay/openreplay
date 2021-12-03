from chalicelib.core import users
from chalicelib.utils import email_helper, captcha, helper


def reset(data):
    print("====================== reset password ===============")
    print(data)
    if helper.allow_captcha() and not captcha.is_valid(data["g-recaptcha-response"]):
        print("error: Invalid captcha.")
        return {"errors": ["Invalid captcha."]}
    if "email" not in data:
        return {"errors": ["email not found in body"]}
    if not helper.has_smtp():
        return {"errors": ["no SMTP configuration found, you can ask your admin to reset your password"]}
    a_user = users.get_by_email_only(data["email"])
    if a_user is not None:
        # ---FOR SSO
        if a_user.get("origin") is not None and a_user.get("hasPassword", False) is False:
            return {"errors": ["Please use your SSO to login"]}
        # ----------
        invitation_link = users.generate_new_invitation(user_id=a_user["id"])
        email_helper.send_forgot_password(recipient=data["email"], invitation_link=invitation_link)
    else:
        print(f"invalid email address [{data['email']}]")
        return {"errors": ["invalid email address"]}
    return {"data": {"state": "success"}}
