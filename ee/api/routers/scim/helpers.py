from typing import Any, Literal
from chalicelib.utils import pg_client
from scim2_models import Schema, Resource, ResourceType
import os
import json
from decouple import config, Csv


def safe_mogrify_array(
        items: list[Any] | None,
        array_type: Literal["varchar", "int"],
        cursor: pg_client.PostgresClient,
) -> str:
    items = items or []
    fragments = [cursor.mogrify("%s", (item,)).decode("utf-8") for item in items]
    result = f"ARRAY[{', '.join(fragments)}]::{array_type}[]"
    return result


def load_json_resource(json_name: str) -> dict:
    with open(json_name) as f:
        return json.load(f)


def load_scim_resource(
        json_name: str, type_: type[Resource]
) -> dict[str, type[Resource]]:
    ret = {}
    definitions = load_json_resource(json_name)
    for d in definitions:
        model = type_.model_validate(d)
        ret[model.id] = model
    return ret


def load_custom_schemas() -> dict[str, Schema]:
    json_name = os.path.join("routers", "scim", "fixtures", "custom_schemas.json")
    return load_scim_resource(json_name, Schema)


def load_custom_resource_types() -> dict[str, ResourceType]:
    json_name = os.path.join(
        "routers", "scim", "fixtures", "custom_resource_types.json"
    )
    return load_scim_resource(json_name, ResourceType)


__SCIM_USED = False


def is_scim_available():
    global __SCIM_USED
    if not __SCIM_USED:
        with pg_client.PostgresClient() as cur:
            cur.execute("""SELECT EXISTS(SELECT *
                                         FROM public.scim_auth_codes);""")
            __SCIM_USED = cur.fetchone()["exists"]
    return __SCIM_USED


def set_scim_available():
    global __SCIM_USED
    __SCIM_USED = True

PREFIXES = config("idp_group_prefixes", cast=Csv(), default="")
if len(PREFIXES) == 0:
    PREFIXES = ["openreplay", "or"]
else:
    PREFIXES = [p.lower() for p in PREFIXES]

def group_name_to_role_name(group_name: str) -> str:
    if group_name is None or len(group_name) == 0:
        return group_name

    for prefix in PREFIXES:
        if group_name.lower().startswith(prefix):
            group_name = group_name[len(prefix):]
            break

    if group_name.startswith((".", " ", "-", "_")):
        group_name = group_name[1:]

    return group_name.strip()
