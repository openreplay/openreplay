import re

_NEWLINE_RE = re.compile(r"[\r\n]+")
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_DEFAULT_MAX_LEN = 512


def sanitize(value, max_length: int = _DEFAULT_MAX_LEN) -> str:
    """Sanitize a value before interpolating it into a log message.

    Strips CR/LF (prevents log forging), null bytes and ANSI/control
    characters, then truncates. Use for any externally-sourced data:
    request bodies, headers, URLs, JWT contents, third-party responses.
    """
    if value is None:
        return ""
    s = value if isinstance(value, str) else repr(value)
    s = _NEWLINE_RE.sub(" ", s)
    s = _CONTROL_CHARS_RE.sub("", s)
    if len(s) > max_length:
        s = s[:max_length] + "...(truncated)"
    return s