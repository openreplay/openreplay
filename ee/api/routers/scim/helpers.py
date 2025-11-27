from typing import Any, Literal
from chalicelib.utils import pg_client
from scim2_models import Schema, Resource, ResourceType
import os
import json


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


def group_name_to_role_name(group_name: str) -> str:
    if group_name is None:
        return None

    if group_name.lower().startswith("openreplay"):
        return group_name_to_role_name(group_name[len("openreplay"):])
    elif group_name.lower().startswith("or"):
        return group_name_to_role_name(group_name[len("or"):])
    elif group_name.startswith((".", " ", "-", "_")):
        return group_name_to_role_name(group_name[1:])
    return group_name.strip()
