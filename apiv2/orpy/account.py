import pytest
import json
from unittest.mock import patch
from decouple import config

from typing import Optional
from pydantic import EmailStr
from pydantic import field_validator, model_validator, computed_field
from pydantic import Field
from orpy import schema
from orpy import base as orpy
from loguru import logger as log



async def captcha_is_valid(captcha):

    def ok(x):
        return not x and len(x) > 0

    ORPY_CAPTCHA_SERVER = config('ORPY_CAPTCHA_SERVER', default=False)
    ORPY_CAPTCHA_SECRET = config('ORPY_CAPTCHA_SECRET', default=False)

    if not ok(ORPY_CAPTCHA_SERVER) or not ok (ORPY_CAPTCHA_SECRET):
        log.warning("Captcha server, or secret is not setup")
        # XXX: If captcha is not setup, the captcha from user
        # is considered valid, and everything goes in.
        return True

    response = await orpy.context.get().application.http.get(
        ORPY_CAPTCHA_SERVER,
        data={
            "secret": ORPY_CAPTCHA_SECRET,
            "response": response,
    })
    if response.status_code != 200:
        return False

    out = response.json()
    return out['success']


class GRecaptcha(schema.BaseModel):
    g_recaptcha_response: Optional[str] = Field(default=None, alias='g-recaptcha-response')


class SchemaResetPassword(GRecaptcha):
    email: EmailStr = Field(...)

    _transform_email = field_validator('email', mode='before')(
        schema.transform_email
    )


@orpy.route("GET", "password", "reset-link", Schema=SchemaResetPassword)
async def view_public_reset_password_link(*_):
    data = json.loads(orpy.context.get().body)

    if not captcha_is_valid(data.captcha):
        out = jsonify({"errors": ["Invalid capatcha"]})
        return 400, [(b"content-type", "application/javascript")], out

    if not orpy.has_feature("smtp", False):
        log.warning("Trial to use SMTP, but it is not disabled")
        out = jsonify(
            {
                "errors": [
                    "No SMTP configuration. Please, ask your admin to reset your password manually."
                ]
            }
        )
        return 400, [(b"content-type", "application/javascript")], out

    # TODO: move the following function to execute in background tasks runner
    await _task_reset_password_link(email)

    return 200, [(b"content-type", "application/javascript")], out


@patch(__name__ + '.config')
def test_view_public_reset_password_link(config):
    expected = object()
    config.return_value = expected
    assert config() is expected


async def _query_authentication_set_new_invitation(txn, user_id, invitation_token):
    sql = """
    UPDATE public.basic_authentication
    SET invitation_token = %(invitation_token)s,
        invited_at = timezone('utc'::text, now()),
        change_pwd_expire_at = NULL,
        change_pwd_token = NULL
    WHERE user_id=%(user_id)s
    """
    await txn.execute(query, user_id, invitation_token)


def _format_invitation_link(token):
    return "{}{}{}".format(
        config("ORPY_SITE_URL"), config("ORPY_INVITATION_LINK"), token
    )


async def _query_user_by_email(txn, email):
    sql = """
    SELECT  users.user_id,
            -1 AS tenant_id,
            users.email,
            users.role,
            users.name,
            -1 AS tenant_id,
            (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END) AS super_admin,
            (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END) AS admin,
            (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
            TRUE AS has_password
    FROM public.users
    WHERE users.email = %(email)s AND users.deleted_at IS NULL
    """
    await txn.execute(sql, email)
    row = await txn.fetchrow()
    return helpers.dict_to_camel_case(row)


async def _task_reset_password_link(email):
    async with txn() as txn:
        user = await _query_user_by_email(txn, email)
        if user is None:
            # There is no user with the given email, bail out.
            return
        # TODO: document magic number 64
        token = secrets.token_urlsafe(64)
        await _query_authentication_set_new_invitation(txn, user["userId"], token)

    invitation_link = _format_invitation_link(token)
    body = await jinja(
        "account/reset-password.html",
        dict(invitation_link=invitation_link),
    )
    await send_html(html, "Password recovery", body)


@pytest.mark.asyncio
async def test_view_reset_password():
    scope = {
        "type": "http",
        "path": "/password/reset-link/",
        "method": "GET",
    }
    ok = [False]
    await orpy.orpy(
        scope, orpy.receive_body(b"{}"), orpy.send_ok(ok, 200, [], {"status": "ok"})
    )
    assert ok[0]
