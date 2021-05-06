import smtplib
from chalicelib.utils.helper import environ


class EmptySMTP:
    def sendmail(self, from_addr, to_addrs, msg, mail_options=(), rcpt_options=()):
        print("!! CANNOT SEND EMAIL, NO VALID SMTP CONFIGURATION FOUND")


class SMTPClient:
    server = None

    def __init__(self):
        if environ["EMAIL_HOST"] is None or len(environ["EMAIL_HOST"]) == 0:
            return
        elif environ["EMAIL_USE_SSL"].lower() == "false":
            self.server = smtplib.SMTP(host=environ["EMAIL_HOST"], port=int(environ["EMAIL_PORT"]))
        else:
            if len(environ["EMAIL_SSL_KEY"]) == 0 or len(environ["EMAIL_SSL_CERT"]) == 0:
                self.server = smtplib.SMTP_SSL(host=environ["EMAIL_HOST"], port=int(environ["EMAIL_PORT"]))
            else:
                self.server = smtplib.SMTP_SSL(host=environ["EMAIL_HOST"], port=int(environ["EMAIL_PORT"]),
                                               keyfile=environ["EMAIL_SSL_KEY"], certfile=environ["EMAIL_SSL_CERT"])

    def __enter__(self):
        if self.server is None:
            return EmptySMTP()
        self.server.ehlo()
        if environ["EMAIL_USE_SSL"].lower() == "false" and environ["EMAIL_USE_TLS"].lower() == "true":
            self.server.starttls()
            # stmplib docs recommend calling ehlo() before & after starttls()
            self.server.ehlo()
        self.server.login(user=environ["EMAIL_USER"], password=environ["EMAIL_PASSWORD"])
        return self.server

    def __exit__(self, *args):
        if self.server is None:
            return
        self.server.quit()
