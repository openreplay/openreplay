from .overrides import Enum

from typing import Union, Any, Type

NAME_PATTERN = r"^[a-z,A-Z,0-9,\-,é,è,à,ç, ,|,&,\/,\\,_,.,#]*$"


def transform_email(email: str) -> str:
    return email.lower().strip() if isinstance(email, str) else email


def int_to_string(value: int) -> str:
    return str(value) if isinstance(value, int) else value


def remove_whitespace(value: str) -> str:
    return " ".join(value.split()) if isinstance(value, str) else value


def remove_duplicate_values(value: list) -> list:
    if value is not None and isinstance(value, list):
        if len(value) > 0 \
                and (isinstance(value[0], int) or isinstance(value[0], dict)):
            return value
        value = list(set(value))
    return value


def single_to_list(value: Union[list, Any]) -> list:
    if value is not None and not isinstance(value, list):
        value = [value]
    return value


def force_is_event(events_enum: list[Type[Enum]]):
    def fn(value: list):
        if value is not None and isinstance(value, list):
            for v in value:
                r = False
                for en in events_enum:
                    if en.has_value(v["type"]) or en.has_value(v["type"].lower()):
                        r = True
                        break
                v["isEvent"] = r
        return value

    return fn
