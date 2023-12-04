import asyncio
import json
import os
import re
import sys
import time
from collections import namedtuple
from contextvars import ContextVar
from mimetypes import guess_type
from pathlib import Path
from typing import Optional

import orpy
import httpx
import psycopg
import psycopg_pool
import pytest
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from decouple import config
from loguru import logger as log
from pampy import _, match
from pydantic import Field, ValidationError

import orpy.smtp
from orpy import schema

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


def has_feature(name, default):
    FEATURES = dict(smtp=True)
    return FEATURES.get(name, default)


Application = namedtuple(
    "Application",
    (
        "postgresql",
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


def email_send(subject, recipients, body, bcc=None):
    def email_embed_images(HTML):
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
                sub = "static/" + sub
                with open(sub, "rb") as image_file:
                    img = base64.b64encode(image_file.read()).decode("utf-8")
                mime_img.append(MIMEImage(base64.standard_b64decode(img)))
                mime_img[-1].add_header("Content-ID", f"<img-{len(mime_img) - 1}>")
        return HTML, mime_img

    BODY_HTML, mime_img = email_embed_images(BODY_HTML)

    if not isinstance(recipients, list):
        recipients = [recipients]

    msg = MIMEMultipart()
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = config("EMAIL_FROM")
    msg["To"] = ""
    body = MIMEText(BODY_HTML.encode("utf-8"), "html", "utf-8")
    msg.attach(body)
    for m in mime_img:
        msg.attach(m)

    # TODO: Attach text/plain via html2text to workaround spam filters
    with orpy.smtp.SMTPClient() as s:
        for recipient in recipients:
            msg.replace_header("To", recipient)
            out = [recipient]
            if bcc is not None and len(bcc) > 0:
                out += [bcc]
            log.debug(
                "Email sending to with `subjet`, `from`, and `to`: {subjet} {from} {out}",
                subject,
                msg["FROM"],
                out,
            )
            try:
                s.sendmail(msg["FROM"], out, msg.as_string().encode("ascii"))
            except Exception as e:
                log.exception("Failed to send mail")


def runner_spawn(coroutine):
    """Schedule a coroutine as a task. Returns None.

    The advantage of `await runner_spawn(coroutine)` compared to
    `await coroutine()` is that the former will not consume client
    latency time. It is advisable to use it, for doing small fire and
    forget things that do not influence the response returned to the
    client.

    The advantage of `runner_spawn` compared to `asyncio.create_task`
    is that there is only one task that can running at any time. That
    will reduce throughput, but also keep the load under control.

    This is advisable to avoid to freeze an application server under
    the load of background tasks running in the same POSIX processus,
    and POSIX thread.

    For coroutines that are CPU heavy, or span for more than 100
    milliseconds, use a dedicated service, and/or pipeline via a
    queue.

    If you do not known what you are doing, use `runner_spawn`.

    """
    context.get().tasks.add(coroutine)
    context.get().application.on_task.set()


async def runner_run():
    """Wait for task, run them"""
    while application.get() is None:
        await asyncio.sleep(0.1)
    while asyncio.get_event_loop().is_running():
        await application.get().on_task
        # TODO: Do something clever to increase concurrency, hence
        # throughput.
        while application.get() and application.get().tasks:
            task = application.get().tasks.pop()
            await task




class ORPYAsyncConnection(AsyncConnection):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, row_factory=dict_row, **kwargs)


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

    database = psycopg_pool.AsyncConnectionPool(kwargs=database, connection_class=ORPYAsyncConnection)

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


def route(method, *components, Schema=None):
    route = [method] + list(components)

    def wrapper(handler):
        log.debug("Registring route: {} @ {}", route, handler)

        # TODO: replace functor with functools.partial?
        def action(*args):
            async def route():
                if Schema is None:
                    out = await handler(*args)
                    return out

                headers = dict(context.get().scope.get("headers", dict()))
                content = headers.get(b"content-type")
                if content != b"application/json":
                    log.debug(
                        "Wrong content-type for: {} {} {}", handler, method, components
                    )
                    return (
                        400,
                        [(b"content-type", b"application/json")],
                        b'{"ok": false, "reason": "wrong header content-type"}',
                    )
                try:
                    body = context.get().body
                    log.debug("body: {}", body)
                    kwargs = json.loads(body)
                    payload = Schema(**kwargs)
                except ValidationError as e:
                    log.debug(
                        "Schema validation failed for: {} {} {}",
                        handler,
                        method,
                        components,
                    )
                    return (
                        400,
                        [(b"content-type", b"application/json")],
                        b'{"ok": false, "reason": "schema validation failed"}',
                    )
                context.get().cache["payload"] = payload
                out = await handler(*args)
                return out

            return route

        ROUTE_REGISTRY.extend((route, action))
        return route

    return wrapper


Context = namedtuple("Context", ["application", "scope", "body", "cache"])
application: Application = ContextVar("application", default=None)
context: Context = ContextVar("context", default=None)


@route("GET")
async def index(*_):
    log.debug("index scope: {}", context.get().scope)
    log.debug("index body: {}", context.get().body)
    return 200, [(b"content-type", b"text/plain")], b"hello from orpy 3"


def jsonify(obj):
    return json.dumps(obj).encode("utf8")


import contextlib


@contextlib.asynccontextmanager
async def cnx():
    async with context.get().application.postgresql.connection() as cnx:
        async with cnx.transaction():
            yield cnx


@contextlib.asynccontextmanager
async def _test_cnx():
    async with application.get().postgresql.connection() as cnx:
        async with cnx.transaction():
            yield cnx


class SchemaHealth(schema.BaseModel):
    # That is the simplest schema possible, to help with test schema
    # validation at the lowest level.
    pass


@route("GET", "health", Schema=SchemaHealth)
async def view_get_health(*_):
    # XXX: For some reason pampy.match will pass all the matched
    # value when there is no variable / placeholder, that is why
    # there is a snake argument *_
    return (
        200,
        [(b"content-type", b"application/json")],
        jsonify({}),
    )


async def not_found(send):
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


async def http(send):
    path = context.get().scope["path"]

    if path == "/favicon.ico":
        await not_found(send)
        return

    if not path.endswith("/"):
        # XXX: All paths but static path must end with a slash.  That
        # is a dubious choice when considering files, possibly large
        # files that are served dynamically.

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
        return

    method = context.get().scope["method"]
    route = [method] + path.split("/")[1:-1]

    log.debug("matching route: {}", route)

    view = match(
        route,
        *ROUTE_REGISTRY,
        _, lambda x: None,
    )

    if view is None:
        await not_found(send)
        return

    # XXX: the body must be bytes, TODO it will be
    # wise to support a body that is a generator?
    response = await view()

    code, headers, body = response

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
    """ASGI entry point

    If the scope is the lifespan scope, then initialize the context
    variable: `application`. The context variable `application` is
    used as singleton that reference other variable that are also by
    construction singletons e.g. database connection pool.

    Note: context variables travel with the flow of execution taking
    into account asyncio event loop async execution workflow.  See:
    https://docs.python.org/3/library/contextvars.html;

    Otherwise, at this time, scope can only be an http request scope,
    then the incoming scope, and body is matched on the pairing of the
    HTTP method, and path, called route, to a function, called a route
    handler that was registred in `ROUTE_REGISTRY` global to the
    application with the function decorator called `@route` at import
    time.
    """

    log.debug("ASGI scope: {}", scope)

    if scope["type"] == "lifespan" and application.get() is None:
        application.set(await make_application())
        return

    context.set(
        Context(
            application.get(),
            scope,
            await receive_body(receive),
            dict(),
        )
    )

    assert scope["type"] == "http"

    await http(send)


async def receive_body(receive):

    """
    Read and return the entire body from an incoming ASGI message.
    """
    body = b""
    more_body = True

    while more_body:
        message = await receive()
        body += message.get("body", b"")
        more_body = message.get("more_body", False)

    if len(body) > 3 * 10**6:  # a body with 3 millions bytes
        log.warning("Unexpected large HTTP request...")

    return body


def test_true():
    assert True


async def receive_empty():
    return {"body": b""}


def make_receive_body(bytes):
    """Return a ASGI function that produce a body with BYTES"""

    async def receive():
        return {"body": bytes}

    return receive


def send_ok(called, status_code, headers, body):
    async def func(message):
        called[0] = True
        type = message["type"]
        if type == "http.response.start":
            assert message["status"] == status_code
            for header in headers:
                assert header in message["headers"]
        elif type == "http.response.body":
            assert json.loads(message["body"]) == body
        else:
            assert False, "Unknown message type: {}".format(type)

    return func


@pytest.mark.asyncio
async def test_view_get_health():
    scope = {
        "type": "http",
        "path": "/health/",
        "method": "GET",
        "headers": [(b'content-type', b'application/json')],
    }
    ok = [False]
    await orpy(scope, make_receive_body(b'{}'), send_ok(ok, 200, [], {}))
    assert ok[0]

async def __danger_supervisor_database_scratch():
    with (ORPY_ROOT / 'orpy/sql/danger-supervisor-database-scratch.sql').open() as f:
        sql = f.read()
    async with _test_cnx() as cnx:
        await cnx.execute(sql)
