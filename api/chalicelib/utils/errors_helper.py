from chalicelib.core import sourcemaps


def format_first_stack_frame(error):
    error["stack"] = sourcemaps.format_payload(error.pop("payload"), truncate_to_first=True)
    for s in error["stack"]:
        for c in s.get("context", []):
            for sci, sc in enumerate(c):
                if isinstance(sc, str) and len(sc) > 1000:
                    c[sci] = sc[:1000]
        # convert bytes to string:
        if isinstance(s["filename"], bytes):
            s["filename"] = s["filename"].decode("utf-8")
    return error
