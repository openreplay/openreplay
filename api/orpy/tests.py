from collections import namedtuple
import pytest
import json
import orpy



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



# XXX: The type pair, and maybe are fused together. 
CX = namedtuple('Combinatorix', ('ok', 'head', 'tail'))


def any():
    
    def func(cx):
        op = cx(objects)
        if not op.ok:
            # Return the error as-is.
            return op
        out = CX(True, objects.head, cx)
        return out

    return func


def when(predicate):

    def func(cx):
        if predicate(cx.head):
            return CX(True, cx.head, cx)
        return CX(False, cx.head, cx)

    return func


def sequence(*args):

    def aux(cx, ops):
        if not ops:
            return cx
        op = ops[0]
        tail = aux(cx.tail, ops[1:])
        head = cx(cx.head)
        cx = CX(True, head, tail)
        return cx

    def func(cx):
        cx = aux(cx, args)
        return cx
    
    return func


def cx_from_string(string):
    if not string:
        return None
    cx = CX(string[0], cx_from_string(string[1:]))
    return cx


def cx_to_string(cx):
    return cx.head + cx_to_string(cx.tail)


def test_cx_stringify():
    assert "abcdef" == cx_to_string(cx_from_string("abcdef"))


def test_cx_fortythree():
    four = when(lambda x: x == '4')
    three = when(lambda x: x == '3')
    fourthree = sequence(four, three)
    fortytwo = '42'
    assert not fourthree(fortytwo)
    fortythree = '43'
    assert fourthree(fortythree)

