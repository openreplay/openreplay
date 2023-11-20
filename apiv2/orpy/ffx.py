from urllib.parse import urljoin
import json
import asyncio
import time
import sys
from pathlib import Path
from collections import namedtuple
from mimetypes import guess_type

from lxml.html import fromstring as string2html  # nosec - wip code
from pampy import match, _
from loguru import logger as log
import httpx

import found

import pstore
from html2text import html2text
from string import punctuation
from collections import Counter

ROOT = Path(__file__).parent.resolve()

log.info('That is beautiful, and simple logging')

HELP = """Welcome!

- Type anything to search with duckduckgo;

- To use the builtin search engine use `search my keywords ...` that
  will search for `my keywords ...` inside babelia's very own index;

- To iterate over search result use `next`;

- To view the last url, use `view`;

- To bookmark, and index the last url, use the command `bookmark`;

That is all... foxes!
"""


def bagomatic(html):
    try:
        text = html2text(html)
        text = ''.join(' ' if x in punctuation else x for x in text)
        bag = Counter(x for x in text.split() if 256 > len(x) >= 2)
        return bag
    except Exception:
        return None


def html2h(html, stack=None):
    # remove useless stuff
    if html.tag in ["script", "style", 'form', 'input', 'button',
                    'textarea', 'svg', 'nav', 'header', 'footer',
                    'include-fragment', 'fragment']:
        return ""

    # remove comments
    if not isinstance(html.tag, str):
        return ""

    # try to sanitize links
    if html.tag == 'a' and html.attrib.get('href', '').startswith('https://'):
        attrib = dict(href=html.attrib.get('href'), target="_blank")
    else:
        attrib = dict()

    if stack is None:
        stack = list()

    stack.append(html.tag)
    try:
        stack.index('pre')
    except ValueError:
        pre = False
    else:
        pre = True

    # create children
    children = list()
    if html.text and pre:
        children.append(html.text)
    elif html.text and not pre and html.text.strip():
        children.append(html.text.strip())

    for child in html.iterchildren():
        children.append(html2h(child, stack))
        if html.tail and pre:
            children.append(html.tail)
        elif html.tail and not pre and html.tail.strip():
            children.append(html.tail.strip())

    if all(not x.strip() if isinstance(x, str) else (not x) for x in children):
        return ""
    else:
        node = getattr(h, html.tag)(**attrib)
        node.extend(children)
        return node


def make_timestamper():
    start_monotonic = time.monotonic()
    start = time.time()
    loop = asyncio.get_event_loop()

    def timestamp():
        # Wanna be faster than datetime.now().timestamp()
        # approximation of current epoch time in float seconds
        out = start + loop.time() - start_monotonic
        return out

    return timestamp


Application = namedtuple('Application', ('database', 'http', 'make_timestamp', 'index'))


async def make_application():
    # setup loguru logging
    # TODO: integrate with python's logging
    log.remove()
    log.add(sys.stderr, enqueue=True)

    # setup app
    make_timestamp = make_timestamper()
    http = httpx.AsyncClient()
    database = await found.open()
    app = Application(
        database,
        http,
        make_timestamp,
        pstore.make('index', ('indexv1',)),
    )
    return app


async def view_index(app, scope):
    index = ROOT / 'index.html'
    with index.open('rb') as f:
        index = f.read()
    return 200, b'text/html', index


application = None


async def main(scope, receive, send):
    log.debug('Scope: {}', scope)
    global application

    if application is None:
        application = await make_application()

    try:
        if scope['type'] == 'http':
            out = await http(application, scope, receive, send)
            return out
        elif scope['type'] == 'websocket':
            out = await websocket(application, scope, receive, send)
            return out
        else:
            raise HyperDevException('unknown scope type')
    except Exception as exc:
        log.exception(exc)


async def websocket(application, scope, receive, send):
    # https://asgi.readthedocs.io/en/latest/specs/www.html#websocket
    assert scope['type'] == 'websocket'
    events = dict()
    previous = dict()
    history = []

    context = dict()

    event = await receive()

    assert event['type'] == 'websocket.connect'

    # TODO: Accept only when path == /api/websocket

    # TODO: Authentication

    await send({'type': 'websocket.accept'})

    while True:
        event = await receive()

        # TODO: support type == websocket.close
        assert event['type'] == 'websocket.receive'
        message = json.loads(event['text'])
        log.debug(message)

        if message['type'] == 'init':

            async def onQuery(event):
                query = event['payload']['target.value']
                context['query'] = query = query or context['query']
                user = h.div(Class="babelia-convo")[
                    h.span()["🐵 " + query],
                ]
                history.append(user)

                if query == 'next':
                    try:
                        hit = await context['hits'].__anext__()
                    except StopAsyncIteration:
                        pass
                    else:
                        context["hit"] = hit
                        history.append(h.div(Class="babelia-convo")[
                            h.a(href=hit, target="_blank")[hit]
                        ])
                elif query == 'view':
                    response = await application.http.get(context['hit'])
                    html = string2html(response.text)
                    body = html.xpath('//body')[0]
                    body.tag = 'div'
                    if 'github.com' in context['hit'] and body.xpath('//*[@id="readme"]'):
                        body = body.xpath('//*[@id="readme"]')[0]
                    if 'stackoverflow.com' in context['hit'] and body.xpath('//*[@id="content"]'):
                        body = body.xpath('//*[@id="content"]')[0]

                    for a in body.xpath('//a'):
                        href = a.attrib.get('href', '')
                        href = urljoin(context['hit'], href)
                        a.attrib['href'] = href

                    html = html2h(body)

                    convo = h.div(Class="babelia-convo")
                    convo.append(html)
                    history.append(convo)
                elif query == 'bookmark':
                    try:
                        url = context['hit']
                        response = await application.http.get(url)
                        bag = bagomatic(response.text)
                        await found.transactional(
                            application.database,
                            pstore.index,
                            application.index,
                            url,
                            bag,
                        )
                    except Exception:
                        computer = h.p()
                        computer.append("🤖 ")
                        computer.append("There was an error :/")
                        history.append(h.div(Class="babelia-convo")[computer])
                    else:
                        context["hit"] = url
                        computer = h.p()
                        computer.append("🤖 ")
                        computer.append("bookmarked :]")
                        history.append(h.div(Class="babelia-convo")[computer])
                elif query.startswith('search'):
                    keywords = query[len("search"):].strip().split()

                    out = await found.transactional(
                        application.database,
                        pstore.search,
                        application.index,
                        keywords,
                    )

                    async def shim():
                        for hit in out:
                            yield hit[0]

                    context['hits'] = hits = shim()
                    try:
                        hit = await hits.__anext__()
                    except StopAsyncIteration:
                        pass
                    else:
                        context["hit"] = hit
                        computer = h.p()
                        computer.append("🤖 ")
                        computer.append(h.a(href=hit, target="_blank")[hit])
                        history.append(h.div(Class="babelia-convo")[computer])

                else:
                    from hyperdev.raxes import search
                    hits = search(query)
                    context['hits'] = hits
                    try:
                        hit = await hits.__anext__()
                    except StopAsyncIteration:
                        pass
                    else:
                        context["hit"] = hit
                        computer = h.p()
                        computer.append("🤖 ")
                        computer.append(h.a(href=hit, target="_blank")[hit])
                        history.append(h.div(Class="babelia-convo")[computer])

                user = h.div(Class="babelia-convo")[
                    h.label(Class="blink", For="input")["🐵 "],
                    h.input(
                        id="input",
                        type="text",
                        onChange=onQuery,
                        value="",
                        placeholder="somewhere over the rainbow..."
                    ),
                ]
                html = h.div()
                html.extend(history)
                html.append(user)
                babelia = h.div(Class="babelia-convo")[
                    h.input(readonly=True)
                ]
                html.append(babelia)
                html, events = frontend.serialize(html)
                return html, events

            babelia = h.div(Class="babelia-convo")[
                h.pre()["🤖 ", HELP]
            ]

            user = h.div(Class="babelia-convo")[
                h.label(Class="blink", For="input")["🐵 "],
                h.input(
                    id="input",
                    type="text",
                    onChange=onQuery,
                    placeholder="somewhere over the rainbow...",
                    value=""
                ),
            ]
            html = h.div()
            history = [babelia]
            html.extend(history)
            html.append(user)
            babelia = h.div(Class="babelia-convo")[
                h.input(readonly=True)
            ]
            html.append(babelia)
            html, events = frontend.serialize(html)
            previous = events
            await send({'type': 'websocket.send', 'text': json.dumps(html)})

        elif message['type'] == 'dom-event':
            try:
                handler = events[message['uid']]
            except KeyError:
                await send({'type': 'websocket.send', 'text': json.dumps(html)})
            else:
                html, new_events = await handler(message)
                events = dict(new_events)
                events.update(previous)
                previous = new_events
            await send({'type': 'websocket.send', 'text': json.dumps(html)})
        else:
            log.critical('Unknown event type: {}', message['type'])


async def http(application, scope, receive, send):
    assert scope['type'] == 'http'

    path = scope['path']

    if path.startswith('/static/'):
        # XXX: Secure the /static/* route, and avoid people poking at
        # files that are not in the local ./static/
        # directory. Security can be as simple as that.
        if '..' in path:
            await send({
                'type': 'http.response.start',
                'status': 404,
            })
            await send({
                'type': 'http.response.body',
                'body': b"File not found",
            })
        else:
            components = path.split('/')
            filename = components[-1]
            filepath = ROOT / '/'.join(components[1:])
            mimetype = guess_type(filename)[0] or 'application/octet-stream'
            log.critical("mimetype {}", mimetype)
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': [
                    [b'content-type', mimetype.encode('utf8')],
                ],
            })

            with filepath.open('rb') as f:
                await send({
                    'type': 'http.response.body',
                    'body': f.read(),
            })
    elif path == '/favicon.ico':
        await send({
            'type': 'http.response.start',
            'status': 200,
        })
        await send({
            'type': 'http.response.body',
            'body': b"File not found",
            })
    elif not path.endswith('/'):
        # XXX: All paths but static path must end with a slash.  That
        # is a dubious choice when considering files, possibly large
        # files that are served dynamically.

        # XXX: Also at this time it is not used, since all HTTP path
        # serve the ./index.html stuff which always connect via
        # websockets (and there is no check on the websocket path).
        path += '/'
        await send({
            'type': 'http.response.start',
            'status': 301,
            'headers': [
                [b'location', path.encode('utf8')],
            ],
        })
        await send({
            'type': 'http.response.body',
            'body': b"Moved permanently",
        })
    else:
        path = tuple(path.split('/')[1:-1])

        # TODO: match on the HTTP method too, and fallback to 404
        view = match(path,
            _, lambda x: view_index,
        )

        log.debug(view)
        # XXX: the body must be bytes, maybe it would be wise to also
        # support sendfiles and / or a body that is a bytes generator
        code, mimetype, body = await view(application, scope)

        await send({
            'type': 'http.response.start',
            'status': code,
            'headers': [
                [b'content-type', mimetype],
            ],
        })
        await send({
            'type': 'http.response.body',
            'body': body,
        })
