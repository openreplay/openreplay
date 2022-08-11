import logging
import smtplib
from smtplib import SMTPAuthenticationError

from decouple import config
from starlette.exceptions import HTTPException


class EmptySMTP:
    def sendmail(self, from_addr, to_addrs, msg, mail_options=(), rcpt_options=()):
        logging.error("!! CANNOT SEND EMAIL, NO VALID SMTP CONFIGURATION FOUND")


class SMTPClient:
    server = None

    def __init__(self):
        if config("EMAIL_HOST") is None or len(config("EMAIL_HOST")) == 0:
            return
        elif config("EMAIL_USE_SSL").lower() == "false":
            self.server = smtplib.SMTP(host=config("EMAIL_HOST"), port=int(config("EMAIL_PORT")))
        else:
            if len(config("EMAIL_SSL_KEY")) == 0 or len(config("EMAIL_SSL_CERT")) == 0:
                self.server = smtplib.SMTP_SSL(host=config("EMAIL_HOST"), port=int(config("EMAIL_PORT")))
            else:
                self.server = smtplib.SMTP_SSL(host=config("EMAIL_HOST"), port=int(config("EMAIL_PORT")),
                                               keyfile=config("EMAIL_SSL_KEY"), certfile=config("EMAIL_SSL_CERT"))

    def __enter__(self):
        if self.server is None:
            return EmptySMTP()
        self.server.ehlo()
        if config("EMAIL_USE_SSL").lower() == "false" and config("EMAIL_USE_TLS").lower() == "true":
            self.server.starttls()
            # stmplib docs recommend calling ehlo() before & after starttls()
            self.server.ehlo()
        if len(config("EMAIL_USER", default="")) > 0 and len(config("EMAIL_PASSWORD", default="")) > 0:
            try:
                self.server.login(user=config("EMAIL_USER"), password=config("EMAIL_PASSWORD"))
            except SMTPAuthenticationError:
                raise HTTPException(401, "SMTP Authentication Error")
        return self.server

    def __exit__(self, *args):
        if self.server is None:
            return
        self.server.quit()
