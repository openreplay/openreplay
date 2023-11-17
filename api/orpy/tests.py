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

# Promote a reader to first-class to allow tree walk
CXR_type = namedtuple('CombinatorixReader', ('reader', 'args', 'read'))


def CXR(reader, *args):
    return CXR_type(reader, args, reader(*args))


def any():
    """Read anything"""

    def func(cx):
        return CX(True, cx.head, cx.tail)

    return func


def cx_when(predicate):
    """Read when PREDICATE is returns true"""

    def func(cx):
        if predicate(cx.head):
            return CX(True, cx.head, cx.tail)
        return CX(False, cx.head, cx.tail)

    return func


def cx_sequence(*readers):
    """Read when all READERS can read"""

    readers = [
        reader.read if isinstance(reader, CXR_type) else reader for reader in readers
    ]

    def aux(cx, ops):
        if not ops:
            return CX(True, None, None)
        if cx is None:
            return CX(False, None, None)

        op = ops[0]
        head = op(cx)
        if not head.ok:
            return CX(False, head.head, None)
        out = CX(True, head.head, aux(head.tail, ops[1:]))
        return out

    def func(cx):
        cx = aux(cx, readers)
        return cx
    
    return func


def cx_zero_or_more(reader):
    """Read zero or more time with READER"""

    reader = reader.read if isinstance(reader, CXR_type) else reader

    def aux(cx):
        if cx is None:
            return CX(False, None, None)

        if cx.head is None:
            return CX(False, cx.head, cx.tail)

        head = reader(cx)

        if not head.ok:
            return cx
        else:
            return head
        
    def func(cx):
        out = []
        while cx := aux(cx):
            if cx.ok:
                out.append(cx.head)
                cx = cx.tail
            else:
                return CX(True, out, CX(None, cx.head, cx.tail))
                

    return func


def cx_from_string(string):
    """Translate STRING to a datastructure that reader can read"""

    if not string:
        return None

    cx = CX(None, string[0], cx_from_string(string[1:]))
    return cx


def cx_to_string(cx):
    """Convert CX to a string"""
    if not cx:
        return ''
    if cx.head is None:
        return ''
    if not cx.ok:
        return ''
    
    head = cx.head if isinstance(cx.head, str) else ''.join(cx.head)

    return head + cx_to_string(cx.tail)


def TODO_test_cx_stringify():
    assert "abcdef" == cx_to_string(cx_zero_or_more(any())(cx_from_string("abcdef")))


def test_cx_when():
    input = cx_from_string("yinyang")
    why = CXR(cx_when, lambda x: x == 'y')
    cx = why.read(input)
    assert cx.ok
    assert cx.head == 'y'


def test_cx_fortythree():
    four = CXR(cx_when, lambda x: x == '4')
    three = CXR(cx_when, lambda x: x == '3')
    cx = cx_sequence(four, three)
    fortytwo = cx_from_string('42')
    fortytwo = cx(fortytwo)
    assert cx_to_string(fortytwo) == '4'
    fortythree = cx_from_string('43')
    fortythree = cx(fortythree)
    assert fortythree.ok
    assert cx_to_string(fortythree) == '43'


def test_cx_any_sequence():
    out = cx_sequence(any(), any(), any())(cx_from_string('random'))
    assert out.ok
    assert cx_to_string(out) == 'ran'


def test_zero_or_more():
    out = cx_to_string(cx_zero_or_more(any())(cx_from_string('Will, i am.')))
    assert out == 'Will, i am.'


def test_zero_or_more_parentheses():
    cx = cx_zero_or_more(cx_when(lambda x: x == '('))
    out = cx(cx_from_string("(((zzz"))
    assert cx_to_string(out) == "((("


def test_zero_or_more_three_balanced_parentheses():
    pln = cx_zero_or_more(cx_when(lambda x: x == '('))
    prn = cx_zero_or_more(cx_when(lambda x: x == ')'))
    cx = cx_sequence(pln, prn)
    out = cx(cx_from_string("((()))"))
    assert cx_to_string(out) == "((()))"




