from collections import namedtuple
import pytest
import json
from orpy import orpy



def test_true():
    assert True


def receive_nok():
    assert False, 'receive must not be used'


def send_ok(called, status_code, headers, body):
    
    async def func(message):
        called[0] = True
        type = message['type']
        if type == 'http.response.start':
            assert message['status'] == status_code
            for header in headers:
                assert header in message['headers']
        elif type == 'http.response.body':
            assert json.loads(message['body']) == body
        else:
            assert False, "Unknown message type: {}".format(type)
    
    return func


@pytest.mark.asyncio
async def test_health():
    scope = {"type": "http", "path": "/health/", "method": "GET"}
    ok = [False]
    await orpy.orpy(scope, receive_nok, send_ok(ok, 200, [], {"status": "ok"}))
    assert ok[0] 


@pytest.mark.asyncio
async def test_view_reset_password():
    scope = {"type": "http", "path": "/health/", "method": "GET"}
    ok = [False]
    await orpy.orpy(scope, receive_nok, send_ok(ok, 200, [], {"status": "ok"}))
    assert ok[0]
