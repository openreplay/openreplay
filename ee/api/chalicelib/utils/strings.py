import string

jsonb = "'::jsonb,'"
dash = '", "'
dash_nl = ',\n'
dash_key = ")s, %("


def __filter(s, chars, l):
    s = filter(lambda c: c in chars, s)
    s = "".join(s)
    if len(s) == 0:
        return None
    return s[0:l]


__keyword_chars = string.ascii_lowercase + string.ascii_uppercase + string.digits + "_"


def keyword(s):
    if not isinstance(s, str):
        return None
    s = s.strip().replace(" ", "_")
    return __filter(s, __keyword_chars, 30)


__pattern_chars = string.ascii_lowercase + string.ascii_uppercase + string.digits + "_-/*."


def pattern(s):
    if not isinstance(s, str):
        return None
    return __filter(s, __pattern_chars, 1000)


def join(*args):
    return '\x00'.join(args)


def split(s):
    return s.split('\x00')


def hexed(n):
    return hex(n)[2:]
