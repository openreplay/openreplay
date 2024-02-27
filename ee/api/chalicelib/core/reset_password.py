import logging

from decouple import config
from fastapi import BackgroundTasks

import schemas
from chalicelib.core import users
from chalicelib.utils import email_helper, captcha, helper, smtp

logger = logging.getLogger(__name__)


def reset(data: schemas.ForgetPasswordPayloadSchema, background_tasks: BackgroundTasks):
    logger.info(f"forget password request for: {data.email}")
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        print("error: Invalid captcha.")
        return {"errors": ["Invalid captcha."]}
    if not smtp.has_smtp():
        return {"errors": ["no SMTP configuration found, you can ask your admin to reset your password"]}
    a_user = users.get_by_email_only(data.email)
    if a_user is not None:
        # ---FOR SSO
        if a_user.get("origin") is not None and a_user.get("hasPassword", False) is False:
            return {"errors": ["Please use your SSO to login"]}
        if config("enforce_SSO", cast=bool, default=False) and not a_user["superAdmin"] and helper.is_saml2_available():
            return {"errors": ["Please use your SSO to login, enforced by admin"]}

        invitation_link = users.generate_new_invitation(user_id=a_user["userId"])
        background_tasks.add_task(email_helper.send_forgot_password,
                                  recipient=data.email,
                                  invitation_link=invitation_link)
    else:
        logger.warning(f"!!!invalid email address [{data.email}]")
    return {"data": {"state": "A reset link will be sent if this email exists in our system."}}
