#!/usr/bin/env python3


def routes():
    """Available HTTP routes"""
    from app import app
    routes = sorted(app.routes, key=lambda x: x.path)
    # See also:
    #
    #  $ curl https://127.0.0.1:8000 > openapi.json
    #  $ api2thml openapi.json -o index.html
    #  $ python3 -m http.server
    #
    for route in routes:
        out = "{route.path}\t{methods}\t{route.endpoint.__module__}:{route.endpoint.__name__}"
        out = out.format(route=route, methods=' '.join(sorted(route.methods)))
        print(out)

def baggify(path, count=None, reverse=True):
    """Glimpsing over the code base, big words first"""
    import pathlib, sys
    from collections import Counter

    IGNORED = 'data return None dict self from import class name value Optional else'
    IGNORED = set(IGNORED.split())

    path = pathlib.Path(path).resolve()
    bag = Counter()
    for py in path.rglob("*.py"):
        with py.open() as py:
            string = py.read()
            string = ''.join([x if x.isalnum() else ' ' for x in string])
            tokens = string.split()
            bag.update(tokens)

    if count is None:
        count = len(bag)

    bag = bag.most_common(len(bag))

    if reverse:
        bag = list(reversed(bag))

    for name, total in bag:
        if len(name) <= 3:
            continue
        if name in set([str(x) for x in dir(__builtins__)]):
            continue
        if name in IGNORED:
            continue
        print(name, total)
        count -= 1
        if count == 0:
            break
    return 0


def is_interesting(path):
    path = str(path)
    if '/.' in path:
        return False
    if 'node_modules' in path:
        return False
    if '__pycache__' in path:
        return False
    return True


def _iter_directories(root):
    import os
    from pathlib import Path
    for subdir, dirs, files in os.walk(root):
        if not is_interesting(subdir):
            continue
        path = Path(root) / subdir
        path = path.resolve()
        yield path


def sloc(directory):
    files = 0
    lines = 0
    for py in directory.rglob('*.py'):
        with py.open() as py:
            files += 1
            for line in py:
                if not line.strip().isspace():
                     lines += 1
    return files, lines


def summary(root):
    """Number of files, lines of python code, and bag per directory"""
    from pathlib import Path
    root = Path(root).resolve()

    for directory in _iter_directories(root):
        files, lines = sloc(directory)
        if files == 0 or lines == 0:
            continue
        print("\n* summary {}".format(directory))
        print("** file count: {} ".format(files))
        print("** line count: {} ".format(lines))
        print("** bag\n")
        baggify(directory, 10, reverse=False)


def main():
    import sys

    match sys.argv[1:]:
        case ["baggify", directory]:
            sys.exit(baggify(directory))
        case ["summary", root]:
            sys.exit(summary(root))
        case ["routes"]:
            sys.exit(routes())
        case ["sqli", input]:
            try:
                from eralchemy2 import render_er
            except ImportError:
                print("Try: pip install eralchemy2")
                exit(1)
            render_er(input, 'out.pdf')
        case _:
            print("Usage: routes, baggify, summary, sqli")

if __name__ == '__main__':
    main()
