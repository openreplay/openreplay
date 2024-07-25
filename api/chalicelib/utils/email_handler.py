import logging
import re
from email.header import Header
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from decouple import config

from chalicelib.utils import smtp

logger = logging.getLogger(__name__)


def __get_html_from_file(source, formatting_variables):
    if formatting_variables is None:
        formatting_variables = {}
    formatting_variables["frontend_url"] = config("SITE_URL")
    with open(source, "r") as body:
        BODY_HTML = body.read()
        if formatting_variables is not None and len(formatting_variables.keys()) > 0:
            BODY_HTML = re.sub(r"%(?![(])", "%%", BODY_HTML)
            BODY_HTML = BODY_HTML % {**formatting_variables}
    return BODY_HTML


def __replace_images(HTML):
    pattern_holder = re.compile(r'<img[\w\W\n]+?(src="[a-zA-Z0-9.+\/\\-]+")')
    pattern_src = re.compile(r'src="(.*?)"')
    mime_img = []
    swap = []
    for m in re.finditer(pattern_holder, HTML):
        sub = m.groups()[0]
        sub = str(re.findall(pattern_src, sub)[0])
        if sub not in swap:
            swap.append(sub)
            cid = f"img-{len(mime_img)}"
            HTML = HTML.replace(sub, f"cid:{cid}")
            sub = "chalicelib/utils/html/" + sub
            with open(sub, "rb") as image_file:
                img_data = image_file.read()
            mime_img.append(MIMEImage(img_data))
            mime_img[-1].add_header('Content-ID', f'<{cid}>')
    return HTML, mime_img


def send_html(BODY_HTML, SUBJECT, recipient):
    BODY_HTML, mime_img = __replace_images(BODY_HTML)
    if not isinstance(recipient, list):
        recipient = [recipient]
    msg = MIMEMultipart('related')
    msg['Subject'] = Header(SUBJECT, 'utf-8')
    msg['From'] = config("EMAIL_FROM")

    body = MIMEText(BODY_HTML, 'html', "utf-8")
    msg.attach(body)
    for m in mime_img:
        msg.attach(m)

    with smtp.SMTPClient() as s:
        for r in recipient:
            msg["To"] = r
            try:
                logger.info(f"Email sending to: {r}")
                s.send_message(msg)
            except Exception as e:
                logger.error("!!! Email error!")
                logger.error(e)


def send_text(recipients, text, subject):
    with smtp.SMTPClient() as s:
        msg = MIMEMultipart()
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = config("EMAIL_FROM")
        msg['To'] = ", ".join(recipients)
        body = MIMEText(text)
        msg.attach(body)
        try:
            s.send_message(msg)
        except Exception as e:
            logger.error("!! Text-email failed: " + subject),
            logger.error(e)


def __escape_text_html(text):
    return text.replace("@", "<span>@</span>").replace(".", "<span>.</span>").replace("=", "<span>=</span>")
