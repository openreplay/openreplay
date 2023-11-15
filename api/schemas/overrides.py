from typing import TypeVar, Annotated, Union
from enum import Enum as _Enum
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict, TypeAdapter, Field
from pydantic.types import AnyType


def attribute_to_camel_case(snake_str: str) -> str:
    components = snake_str.split("_")
    return components[0] + ''.join(x.title() for x in components[1:])


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
