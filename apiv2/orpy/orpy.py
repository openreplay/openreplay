import asyncio
import json
import os
import re
import secrets
import sys
import time
from collections import namedtuple
from contextvars import ContextVar
from mimetypes import guess_type
from pathlib import Path

import httpx
import psycopg
import psycopg_pool
from decouple import config
from loguru import logger as log
from pampy import _, match

from orpy import helper

ROUTE_REGISTRY = []

ORPY_ROOT = Path(".").resolve()
ORPY_DEBUG = config("ORPY_DEBUG", False)


log.info("orpy logging setup, and working!")

from jinja2 import Environment, PackageLoader, select_autoescape


def make_jinja_environment():
    env = Environment(
        loader=PackageLoader("orpy"),
        autoescape=select_autoescape(),
    )
    return env


async def jinja(template, context):
    env = application.get().jinja
    template = await asyncio.to_thread(env.get_template, template)
    out = template.render(**context)
    return out


def make_timestamper():
    start = time.time()
    loop = asyncio.get_event_loop()

    def timestamp():
        # Faster than datetime.now().timestamp()
        # approximation of current epoch time in float seconds
        out = start + loop.time() - start_monotonic
        return out

    return timestamp


Application = namedtuple(
    "Application",
    (
        "database",
        "http",
        "make_timestamp",
        "cache",
        "jinja",
        # Background tasks runner
        "runner",
        "on_task",
        "tasks",
    ),
)


def runner_spawn(coroutine):
    context.get().tasks.add(coroutine)
    context.get().application.on_task.set()


async def runner_run():
    while application.get() is None:
        await asyncio.sleep(0.1)
    while asyncio.get_event_loop().is_running():
        await application.get().on_task
        while application.get() and application.get().tasks:
            task = application.get().tasks.pop()
            await task


# TODO: use uvicorn lifespan
async def make_application():
    log.debug("orpy:make_application()")
    # https://loguru.readthedocs.io/en/stable/resources/migration.html
    log.remove()
    level = "DEBUG" if ORPY_DEBUG else "WARNING"
    log.add(sys.stderr, enqueue=True, backtrace=True, diagnose=ORPY_DEBUG, level=level)

    # TODO: pick configuration from .env with decouple

    database = {
        "host": config("ORPY_PG_HOST", default="localhost"),
        "dbname": config("ORPY_PG_DBNAME", default="orpy"),
        "user": config("ORPY_PG_USER", default="orpy"),
        "password": config("ORPY_PG_PASSWORD", default="orpy"),
        "port": config("ORPY_PG_PORT", cast=int, default=5432),
        "application_name": config("ORPY_APP_NAME", default="orpy-apiv2"),
    }

    database = " ".join("{}={}".format(k, v) for k, v in database.items())
    # database = psycopg_pool.AsyncConnectionPool(database)

    # setup app
    make_timestamp = make_timestamper()
    http = httpx.AsyncClient()

    app = Application(
        database,
        http,
        make_timestamp,
        # cache
        dict(),
        # jinja
        make_jinja_environment(),
        # Background coroutine that execute tasks
        asyncio.create_task(runner_run()),
        # Event used to signal new task
        asyncio.Event(),
        # tasks
        set(),
    )

    log.debug("Application setup, and runner is up")
    return app


def route(method, *components):
    route = tuple([method] + list(components))

    def wrapper(func):
        log.debug("Registring route: {} @ {}", route, func)
        ROUTE_REGISTRY.extend((route, lambda *x: lambda : func(*x)))
        return func

    return wrapper


Context = namedtuple("Context", ["application", "scope", "receive"])
application: Application = ContextVar("application", default=None)
context: Context = ContextVar("context", default=None)


@route("GET")
async def index():
    return 200, [(b"content-type", b"text/plain")], b"hello from orpy"


def jsonify(obj):
    return json.dumps(obj).encode("utf8")


async def txn():
    # TODO: rename s/database/postgresql/g
    async with context.get().database.connection() as cnx:
        async with cnx.transaction():
            yield cnx


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
    return "{}{}{}".format(config("ORPY_SITE_URL"), config("ORPY_INVITATION_LINK"), token)


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


import time


@route("GET", "health")
def view_health(*_):
    return (
        200,
        [(b"content-type", b"application/javascript")],
        jsonify({"status": "ok"}),
    )


@route("GET", "password", "reset-link")
async def view_public_reset_password_link():
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


async def http(send):
    path = context.get().scope["path"]

    if path.startswith("/static/"):
        # XXX: Secure the /static/* route, and avoid people poking at
        # files that are not in the local ./static/
        # directory. Security can be as simple as that.
        if ".." in path:
            await send(
                {
                    "type": "http.response.start",
                    "status": 404,
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b"File not found",
                }
            )
        else:
            components = path.split("/")
            filename = components[-1]
            filepath = ORPY_ROOT / "/".join(components[1:])
            mimetype = guess_type(filename)[0] or "application/octet-stream"

            await send(
                {
                    "type": "http.response.start",
                    "status": 200,
                    "headers": [
                        [b"content-type", mimetype.encode("utf8")],
                    ],
                }
            )

            with filepath.open("rb") as f:
                await send(
                    {
                        "type": "http.response.body",
                        "body": f.read(),
                    }
                )
    elif path == "/favicon.ico":
        await send(
            {
                "type": "http.response.start",
                "status": 404,
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b"File not found",
            }
        )
    elif not path.endswith("/"):
        # XXX: All paths but static path must end with a slash.  That
        # is a dubious choice when considering files, possibly large
        # files that are served dynamically.

        # XXX: Also at this time it is not used, since all HTTP path
        # serve the ./index.html stuff which always connect via
        # websockets (and there is no check on the websocket path).
        path += "/"
        await send(
            {
                "type": "http.response.start",
                "status": 301,
                "headers": [
                    [b"location", path.encode("utf8")],
                ],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b"Moved permanently",
            }
        )
    else:
        method = context.get().scope["method"]
        route = tuple([method] + path.split("/")[1:-1])

        log.debug("matching route: {}", route)

        view = match(
            route,
            *ROUTE_REGISTRY,
            _,
            lambda x: None,
        )

        if view is None:
            # TODO: factor into a function http_404_not_found
            await send(
                {
                    "type": "http.response.start",
                    "status": 404,
                    "headers": [
                        [b"content-type", b"text/html"],
                    ],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b"Not found",
                }
            )
            return

        # XXX: the body must be bytes, TODO it will be
        # wise to support a body that is a generator
        code, headers, body = view()

        await send(
            {
                "type": "http.response.start",
                "status": code,
                "headers": headers,
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": body,
            }
        )


async def websocket(send):
    import json

    import ffw

    event = await context.get().receive()

    assert event["type"] == "websocket.connect"

    async def on_message():
        await send({"type": "websocket.send", "text": json.dumps(root)})

    dispatch = {
        "websocket.receive": on_message,
    }

    while True:
        event = await context.get().receive()

        if event["type"] == "websocket.disconnect":
            return

        log.info("message: {}", event)

        try:
            message = json.loads(event["text"])
            log.info(message)
            root = ffw.h.div()["Hello, World!"]
            log.critical(root)
            html, events = ffw.serialize(html)
            previous = events
        except Exception:
            log.exception("error!")


async def orpy(scope, receive, send):
    log.debug("ASGI scope: {}", scope)

    if scope["type"] == "lifespan" and application.get() is None:
        application.set(await make_application())
        return

    context.set(Context(application, scope, receive))

    if not ORPY_DEBUG and scope["type"] == "http":
        await http(send)

    if not ORPY_DEBUG:
        return

    if scope["type"] == "http" and scope["path"] == "/":
        with open("static/index.html", "rb") as f:
            body = f.read()
        await send(
            {
                "type": "http.response.start",
                "status": 200,
                "headers": [[b"content-type", b"text/html"]],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": body,
            }
        )
    elif scope["type"] == "websocket":
        await websocket(send)
    else:
        await http(send)
