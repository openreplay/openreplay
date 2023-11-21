import pytest

from orpy import base as orpy


@orpy.route("GET", "password", "reset-link")
async def view_public_reset_password_link(*_):
    # TODO: check receive fetch a complete body
    data = json.loads(await orpy.get().receive())
    if not captcha.is_valid(data.captcha):
        out = jsonify({"errors": ["Invalid capatcha"]})
        return 400, [(b"content-type", "application/javascript")], out
    if not context.features.get("smtp", False):
        out = jsonify(
            {
                "errors": [
                    "No SMTP configuration. Please, ask your admin to reset your password manually."
                ]
            }
        )
        return 400, [(b"content-type", "application/javascript")], out
    runner_spawn(_task_reset_password_link(email))
    return 200, [(b"content-type", "application/javascript")], out


async def _query_authentication_set_new_invitation(txn, user_id, invitation_token):
    # XXX: Investigate whether this will break user password? What
    # does the table basic authentication do?
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
    scope = {"type": "http", "path": "/health/", "method": "GET"}
    ok = [False]
    await orpy.orpy(
        scope, orpy.receive_empty, orpy.send_ok(ok, 200, [], {"status": "ok"})
    )
    assert ok[0]
