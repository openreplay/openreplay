from typing import TypeVar, Annotated, Union, Any
from enum import Enum as _Enum
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict, TypeAdapter, Field
from pydantic.types import AnyType


def attribute_to_camel_case(snake_str: str) -> str:
    components = snake_str.split("_")
    return components[0] + ''.join(x.title() for x in components[1:])


def transform_email(email: str) -> str:
    return email.lower().strip() if isinstance(email, str) else email


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


def schema_extra(schema: dict, _):
    props = {}
    for k, v in schema.get('properties', {}).items():
        if not v.get("doc_hidden", False):
            props[k] = v
    schema["properties"] = props


class BaseModel(_BaseModel):
    model_config = ConfigDict(alias_generator=attribute_to_camel_case,
                              use_enum_values=True,
                              json_schema_extra=schema_extra)


class Enum(_Enum):
    @classmethod
    def has_value(cls, value) -> bool:
        return value in cls._value2member_map_


T = TypeVar('T')


class ORUnion:
    def __new__(self, union_types: Union[AnyType], discriminator: str) -> T:
        return lambda **args: TypeAdapter(Annotated[union_types, Field(discriminator=discriminator)]) \
            .validate_python(args)
