from collections import namedtuple

Application = namedtuple(
    "Application",
    (
        "database",
    ),
)


APPLICATION = None


def set(application):
    global APPLICATION
    APPLICATION = application


def get():
    return APPLICATION
