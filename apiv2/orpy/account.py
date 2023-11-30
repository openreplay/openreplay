import json
import secrets
from typing import Optional
from unittest.mock import patch, AsyncMock

import pytest
from decouple import config
from loguru import logger as log
from pydantic import EmailStr, Field, computed_field, field_validator, model_validator

from orpy import base as orpy
from orpy import schema


async def captcha_is_valid(captcha):
    def ok(x):
        return not x and len(x) > 0

    ORPY_CAPTCHA_SERVER = config("ORPY_CAPTCHA_SERVER", default=False)
    ORPY_CAPTCHA_SECRET = config("ORPY_CAPTCHA_SECRET", default=False)

    if not ok(ORPY_CAPTCHA_SERVER) or not ok(ORPY_CAPTCHA_SECRET):
        log.warning("Captcha server, or secret is not setup")
        # XXX: If captcha is not setup, the captcha from user
        # is considered valid, and everything goes in.
        return True

    response = await orpy.context.get().application.http.get(
        ORPY_CAPTCHA_SERVER,
        data={
            "secret": ORPY_CAPTCHA_SECRET,
            "response": response,
        },
    )
    if response.status_code != 200:
        return False

    out = response.json()
    return out["success"]


class GRecaptcha(schema.BaseModel):
    g_recaptcha_response: Optional[str] = Field(
        default=None, alias="g-recaptcha-response"
    )


class SchemaResetPassword(GRecaptcha):
    email: EmailStr = Field(...)

    _transform_email = field_validator("email", mode="before")(schema.transform_email)


@orpy.route("GET", "password", "reset-link", Schema=SchemaResetPassword)
async def view_public_reset_password_link(*_):
    data = json.loads(orpy.context.get().body)

    if not captcha_is_valid(data.captcha):
        out = jsonify({"errors": ["Invalid capatcha"]})
        return 400, [(b"content-type", "application/json")], out

    if not orpy.has_feature("smtp", False):
        log.warning("Trial to use SMTP, but it is not disabled")
        out = jsonify(
            {
                "errors": [
                    "No SMTP configuration. Please, ask your admin to reset your password manually."
                ]
            }
        )
        return 400, [(b"content-type", "application/json")], out

    # TODO: move the following function to execute in background tasks runner
    orpy.runner_spawn(_task_reset_password_link(email))

    return 200, [(b"content-type", "application/json")], out


async def _query_authentication_set_new_invitation(cnx, user_id, invitation_token):
    sql = """
    UPDATE public.basic_authentication
    SET invitation_token = %(invitation_token)s,
        invited_at = timezone('utc'::text, now()),
        change_pwd_expire_at = NULL,
        change_pwd_token = NULL
    WHERE user_id=%(user_id)s
    """
    await cnx.execute(sql, dict(user_id=user_id, invitation_token=invitation_token))


def _format_invitation_link(token):
    return "{}{}{}".format(
        config("ORPY_SITE_URL"), config("ORPY_INVITATION_LINK"), token
    )


async def _query_user_by_email_exists(cnx, email):
    sql = """
    SELECT users.user_id
    FROM public.users
    WHERE users.email = %(email)s AND users.deleted_at IS NULL
    """
    rows = await cnx.execute(sql, dict(email=email))
    row = await rows.fetchone()
    return row["user_id"] if row else None


async def _task_reset_password_link(email):
    async with orpy.cnx() as cnx:
        user_id = await _query_user_by_email_exists(cnx, email)
        if user_id is None:
            # There is no user with the given email, bail out.
            return False
        # TODO: document magic number 64
        token = secrets.token_urlsafe(64)
        await _query_authentication_set_new_invitation(cnx, user_id, token)

    invitation_link = _format_invitation_link(token)
    body = await orpy.jinja(
        "account/reset-password.html",
        dict(invitation_link=invitation_link),
    )
    await orpy.email_send("Password recovery", email, body)
    return True


@pytest.mark.asyncio
async def test_task_reset_password_link_unknown_email():
    await orpy.orpy({"type": "lifespan"}, None, None)
    orpy.context.set(orpy.Context(orpy.application.get(), None, None, None))
    assert not await _task_reset_password_link("example@example.example")
    await orpy.context.get().application.database.close()


@pytest.mark.asyncio
async def test_task_reset_password_link_known():
    await orpy.orpy({"type": "lifespan"}, None, None)

    await orpy.__danger_supervisor_database_scratch()

    orpy.context.set(orpy.Context(orpy.application.get(), None, None, None))

    with patch("orpy.base.email_send", new=AsyncMock()) as email_send:

        async with orpy._test_cnx() as cnx:
            sql = """
            INSERT INTO users (email, role, name)
            VALUES ('mehdi@openreplay.com', 'member', 'Mehdi')
            """
            await cnx.execute(sql)

        assert await _task_reset_password_link("mehdi@openreplay.com")
        assert email_send.await_count == 1
        subject, email, body = email_send.await_args[0]
        assert subject == 'Password recovery'
        assert email == 'mehdi@openreplay.com'

    await orpy.context.get().application.database.close()
