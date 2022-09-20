import schemas
from chalicelib.core import users
from chalicelib.utils import email_helper, captcha, helper


def reset(data: schemas.ForgetPasswordPayloadSchema):
    print(f"====================== reset password {data.email}")
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        print("error: Invalid captcha.")
        return {"errors": ["Invalid captcha."]}
    if not helper.has_smtp():
        return {"errors": ["no SMTP configuration found, you can ask your admin to reset your password"]}
    a_users = users.get_by_email_only(data.email)
    if len(a_users) > 1:
        print(f"multiple users found for [{data.email}] please contact our support")
        return {"errors": ["multiple users, please contact our support"]}
    elif len(a_users) == 1:
        a_users = a_users[0]
        invitation_link = users.generate_new_invitation(user_id=a_users["id"])
        email_helper.send_forgot_password(recipient=data.email, invitation_link=invitation_link)
    else:
        print(f"!!!invalid email address [{data.email}]")
    return {"data": {"state": "A reset link will be sent if this email exists in our system."}}
