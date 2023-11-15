import asyncio
import sys
import time
from collections import namedtuple
from contextvars import ContextVar
from mimetypes import guess_type

import httpx
import psycopg
import psycopg_pool
from decouple import config
from loguru import logger as log
from pampy import _, match

import helper

ROUTE_REGISTRY = []

ORPY_DEBUG = config("ORPY_DEBUG", False)


log.info("orpy logging setup, and working!")


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
    while not application.get():
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

    database = psycopg_pool.AsyncConnectionPool(
        "dbname=amirouche user=amirouche password=amirouche"
    )

    database = None

    # setup app
    make_timestamp = make_timestamper()
    http = httpx.AsyncClient()

    app = Application(
        database,
        http,
        dict(),
        make_timestamp,
        asyncio.create_task(runner_run()),
        asyncio.Event(),
        set(),
    )

    log.debug("Application setup, and runner is up")
    return app


def route(method, *components):
    route = tuple([method] + list(components))

    def wrapper(func):
        log.debug("Registring route: {} @ {}", route, func)
        ROUTE_REGISTRY.extend((route, lambda x: func))
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


async def _query_basic_authentication_new_invitation(txn, user_id, invitation_token):
    # XXX: Investigate whether this will break user password? What does
    # the table basic authentication do?
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
    return "{}{}{}".format(config("SITE_URL"), config("invitation_link"), token)


import secrets


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


import os


def _read(filepath):
    # XXX: dangerous to use that with a filepath that is not hardcoded.
    for path in sys.path:
        filename = os.path.join(directory, filepath)
        if os.path.exists(filename):
            with open(filename) as f:
                return f.read()
    raise RuntimeError("File not found: {}".format(filepath))


async def read(filepath):
    try:
        content = context.get().application.cache[filepath]
    except KeyError:
        content = asyncio.to_thread(_read(filepath))
        context.get().application.cache[filepath] = content
    return content


def _file_format(source, formatting_variables=None):
    if formatting_variables is None:
        formatting_variables = {}
    formatting_variables["frontend_url"] = config("SITE_URL")
    source = re.sub(r"%(?![(])", "%%", source)
    source = source % formatting_variables
    return source


async def _task_reset_password_link(email):
    async with txn() as txn:
        user = await user_by_email(txn, email)
        if user is None:
            return
        # TODO: document magic number 64
        token = secrets.token_urlsafe(64)
        invitation_link = await user_new_invitation(txn, user["userId"])
    template = await read("chalicelib/utils/html/reset_password.html")
    html = _file_format(template, dict(invitation_link=invitation_link))
    await send_html(html, "Password recovery", email)


@route("GET", "password", "reset-link")
async def public_reset_password_link():
    data = json.loads(await orpy.get().receive())
    if not captcha.is_valid(data.captcha):
        out = jsonify({"errors": ["Invalid capatcha"]})
        return 400, [(b"content-type", "application/javascript")], out
    if not context.features.smtp():
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
            filepath = ROOT / "/".join(components[1:])
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
                "status": 200,
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
        code, headers, body = await view()

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


async def orpy(scope, receive, send):
    log.debug("ASGI scope: {}", scope)

    if scope['type'] == 'lifespan' and application.get() is None:
        application.set(await make_application())

    context.set(Context(application, scope, receive))

    if scope["type"] == "http":
        await http(send)
