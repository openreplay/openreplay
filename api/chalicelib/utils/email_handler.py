import base64
import logging
import re
from email.header import Header
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from decouple import config

from chalicelib.utils import smtp


def __get_subject(subject):
    return subject


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
            HTML = HTML.replace(sub, f"cid:img-{len(mime_img)}")
            sub = "chalicelib/utils/html/" + sub
            with open(sub, "rb") as image_file:
                img = base64.b64encode(image_file.read()).decode('utf-8')
            mime_img.append(MIMEImage(base64.standard_b64decode(img)))
            mime_img[-1].add_header('Content-ID', f'<img-{len(mime_img) - 1}>')
    return HTML, mime_img


def send_html(BODY_HTML, SUBJECT, recipient, bcc=None):
    BODY_HTML, mime_img = __replace_images(BODY_HTML)
    if not isinstance(recipient, list):
        recipient = [recipient]
    msg = MIMEMultipart()
    msg['Subject'] = Header(__get_subject(SUBJECT), 'utf-8')
    msg['From'] = config("EMAIL_FROM")
    msg['To'] = ""
    body = MIMEText(BODY_HTML.encode('utf-8'), 'html', "utf-8")
    msg.attach(body)
    for m in mime_img:
        msg.attach(m)

    with smtp.SMTPClient() as s:
        for r in recipient:
            msg.replace_header("To", r)
            r = [r]
            if bcc is not None and len(bcc) > 0:
                r += [bcc]
            try:
                logging.info(f"Email sending to: {r}")
                s.sendmail(msg['FROM'], r, msg.as_string().encode('ascii'))
            except Exception as e:
                logging.error("!!! Email error!")
                logging.error(e)


def send_text(recipients, text, subject):
    with smtp.SMTPClient() as s:
        msg = MIMEMultipart()
        msg['Subject'] = Header(__get_subject(subject), 'utf-8')
        msg['From'] = config("EMAIL_FROM")
        msg['To'] = ", ".join(recipients)
        body = MIMEText(text)
        msg.attach(body)
        try:
            s.sendmail(msg['FROM'], recipients, msg.as_string().encode('ascii'))
        except Exception as e:
            logging.error("!! Text-email failed: " + subject),
            logging.error(e)


def __escape_text_html(text):
    return text.replace("@", "<span>@</span>").replace(".", "<span>.</span>").replace("=", "<span>=</span>")
