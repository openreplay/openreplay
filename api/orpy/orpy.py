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

ROUTE_REGISTRY = []

ORPY_DEBUG = config("ORPY_DEBUG", False)


log.info("orpy logging setup, and working!")


def make_timestamper():
    start = time.time()
    loop = asyncio.get_event_loop()

    def timestamp():
        # Wanna be faster than datetime.now().timestamp()
        # approximation of current epoch time in float seconds
        out = start + loop.time() - start_monotonic
        return out

    return timestamp


Application = namedtuple("orpy", ("database", "http", "make_timestamp"))


# TODO: use uvicorn lifespan
async def make_application():
    # TODO: integrate with python stdlib logging
    log.remove()
    log.add(sys.stderr, enqueue=True, backtrace=True, diagnose=ORPY_DEBUG)

    # TODO: replace with uvicorn lifespan
    database = psycopg_pool.AsyncConnectionPool(
        "dbname=amirouche user=amirouche password=amirouche"
    )

    # setup app
    make_timestamp = make_timestamper()
    http = httpx.AsyncClient()

    app = Application(
        database,
        http,
        make_timestamp,
    )

    return app


def route(method, *components):
    route = tuple([method] + list(components))

    def wrapper(func):
        log.debug("Registring route: {} @ {}", route, func)
        ROUTE_REGISTRY.extend((route, lambda x: func))
        return func

    return wrapper


application: Application = ContextVar("orpy", default=None)
request: dict = ContextVar("scope")


@route("GET")
async def helloworld():
    return 200, [(b"content-type", b"text/plain")], b"hello world from uvicorn"


async def http(scope, receive, send):
    path = scope["path"]

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
        method = scope["method"]
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


async def handle(scope, receive, send):
    log.debug("ASGI scope: {}", scope)

    if scope["type"] == "http":
        await http(scope, receive, send)


def orpy():
    application.set(asyncio.wait(make_application()))
    return handle
