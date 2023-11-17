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



# XXX: The types 'pair', and 'maybe' are fused together. 

CX = namedtuple('Combinatorix', ('ok', 'head', 'tail'))

CXC = namedtuple('CombinatorixCombiner', ('message', 'func'))


def any():
    
    def func(cx):
        return cx

    return func


cx_any = CXC("read anything", any)


def when(predicate):

    def func(cx):
        if predicate(cx.head):
            return CX(True, cx.head, cx.tail)
        return CX(False, cx.head, cx.tail)

    return func


cx_when = CXC("read when predicate returns True", when)


def sequence(*args):

    def aux(cx, ops):
        if not ops:
            return CX(True, None, None)
        if cx is None:
            return CX(False, None, None)
        op = ops[0]
        head = op(cx)
        if not head.ok:
            return CX(False, head.head, None)
        tail = aux(head.tail, ops[1:])
        if not tail.ok:
            return tail
        if tail.head is None:
            tail = None
        out = CX(True, head.head, tail)
        return out 

    def func(cx):
        cx = aux(cx, args)
        return cx
    
    return func


cx_sequence = CXC("Read in order", sequence)


def zero_or_more(cxc):

    def func(cx):
        if cx.head is None:
            return None

        head = cxc.func(cx)
        if not head.ok:
            return cx

        return CX(True, head.head, func(cx.tail))

    return func


def cx_from_string(string):
    if not string:
        return None
    cx = CX(True, string[0], cx_from_string(string[1:]))
    return cx


def cx_to_string(cx):
    if cx is None:
        return ''
    return cx.head + cx_to_string(cx.tail)


def test_cx_stringify():
    assert "abcdef" == cx_to_string(cx_from_string("abcdef"))


def test_cx_when():
    input = cx_from_string("yinyang")
    why = when(lambda x: x == 'y')
    cx = why(input)
    assert cx.ok
    assert cx.head == 'y'
    assert cx_to_string(cx.tail) == 'inyang'


def test_cx_fortythree():
    four = when(lambda x: x == '4')
    three = when(lambda x: x == '3')
    cx = sequence(four, three)
    fortytwo = cx_from_string('42')
    fortytwo = cx(fortytwo)
    assert not fortytwo.ok
    fortythree = cx_from_string('43')
    fortythree = cx(fortythree)
    assert fortythree.ok
    assert cx_to_string(fortythree) == '43'


def test_cx_any_sequence():
    out = sequence(any(), any(), any())(cx_from_string('random'))
    assert out.ok
    assert cx_to_string(out) == 'ran'
