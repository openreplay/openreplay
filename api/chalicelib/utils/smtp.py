import logging
import smtplib
from smtplib import SMTPAuthenticationError

from decouple import config
from fastapi import HTTPException


class EmptySMTP:
    def sendmail(self, from_addr, to_addrs, msg, mail_options=(), rcpt_options=()):
        logging.error("!! CANNOT SEND EMAIL, NO VALID SMTP CONFIGURATION FOUND")

    def send_message(self, msg):
        self.sendmail( msg["FROM"], msg["TO"], msg.as_string() )

class SMTPClient:
    server = None

    def __init__(self):
        if config("EMAIL_HOST") is None or len(config("EMAIL_HOST")) == 0:
            return
        elif not config("EMAIL_USE_SSL", cast=bool):
            self.server = smtplib.SMTP(host=config("EMAIL_HOST"), port=config("EMAIL_PORT", cast=int))
        else:
            if len(config("EMAIL_SSL_KEY")) == 0 or len(config("EMAIL_SSL_CERT")) == 0:
                self.server = smtplib.SMTP_SSL(host=config("EMAIL_HOST"), port=config("EMAIL_PORT", cast=int))
            else:
                self.server = smtplib.SMTP_SSL(host=config("EMAIL_HOST"), port=config("EMAIL_PORT", cast=int),
                                               keyfile=config("EMAIL_SSL_KEY"), certfile=config("EMAIL_SSL_CERT"))

    def __enter__(self):
        if self.server is None:
            return EmptySMTP()
        self.server.ehlo()
        if not config("EMAIL_USE_SSL", cast=bool) and config("EMAIL_USE_TLS", cast=bool):
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

    def test_configuration(self):
        # check server connexion
        try:
            status = self.server.noop()[0]
            if not (status == 250):
                raise Exception(f"SMTP connexion error, status:{status}")
        except Exception as e:  # smtplib.SMTPServerDisconnected
            logging.error(
                f'!! SMTP connexion error to {config("EMAIL_HOST")}:{config("EMAIL_PORT", cast=int)}')
            logging.error(e)
            return False, e

        # check authentication
        try:
            self.__enter__()
            self.__exit__()
        except Exception as e:
            logging.error(f'!! SMTP authentication error to {config("EMAIL_HOST")}:{config("EMAIL_PORT", cast=int)}')
            logging.error(e)
            return False, e

        return True, None


VALID_SMTP = None
SMTP_ERROR = None
SMTP_NOTIFIED = False


def has_smtp():
    global VALID_SMTP, SMTP_ERROR, SMTP_NOTIFIED
    if SMTP_ERROR is not None:
        logging.error("!!! SMTP error found, disabling SMTP configuration:")
        logging.error(SMTP_ERROR)

    if VALID_SMTP is not None:
        return VALID_SMTP

    if config("EMAIL_HOST") is not None and len(config("EMAIL_HOST")) > 0:
        VALID_SMTP, SMTP_ERROR = check_connexion()
        return VALID_SMTP
    elif not SMTP_NOTIFIED:
        SMTP_NOTIFIED = True
        logging.info("no SMTP configuration found")
    return False


def check_connexion():
    # check SMTP host&port
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(config("EMAIL_CHECK_TIMEOUT", cast=int, default=5))
    result = sock.connect_ex((config("EMAIL_HOST"), config("EMAIL_PORT", cast=int)))
    sock.close()
    if not (result == 0):
        error = f"""!! SMTP {config("EMAIL_HOST")}:{config("EMAIL_PORT", cast=int)} is unreachable
f'please make sure the host&port are correct, and the SMTP protocol is authorized on your server."""
        logging.error(error)
        sock.close()
        return False, error

    return SMTPClient().test_configuration()
