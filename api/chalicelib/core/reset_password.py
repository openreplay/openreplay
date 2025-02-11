import logging

from fastapi import BackgroundTasks

import schemas
from chalicelib.core import users
from chalicelib.utils import email_helper, captcha, helper, smtp

logger = logging.getLogger(__name__)


def reset(data: schemas.ForgetPasswordPayloadSchema, background_tasks: BackgroundTasks):
    logger.info(f"forget password request for: {data.email}")
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        return {"errors": ["Invalid captcha."]}
    if not smtp.has_smtp():
        return {"errors": ["Email delivery failed due to invalid SMTP configuration. Please contact your admin."]}
    a_user = users.get_by_email_only(data.email)
    if a_user:
        invitation_link = users.generate_new_invitation(user_id=a_user["userId"])
        background_tasks.add_task(email_helper.send_forgot_password,
                                  recipient=data.email,
                                  invitation_link=invitation_link)
    else:
        logger.warning(f"!!!invalid email address [{data.email}]")
    return {"data": {"state": "A reset link will be sent if this email exists in our system."}}
