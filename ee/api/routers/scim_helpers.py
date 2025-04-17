from typing import Any
from copy import deepcopy


def get_all_attribute_names(schema: dict[str, Any]) -> list[str]:
    result = []
    def _walk(attrs, prefix=None):
        for attr in attrs:
            name = attr["name"]
            path = f"{prefix}.{name}" if prefix else name
            result.append(path)
            if attr["type"] == "complex":
                sub = attr.get("subAttributes") or attr.get("attributes") or []
                _walk(sub, path)
    _walk(schema["attributes"])
    return result


def get_all_attribute_names_where_returned_is_always(schema: dict[str, Any]) -> list[str]:
    result = []
    def _walk(attrs, prefix=None):
        for attr in attrs:
            name = attr["name"]
            path = f"{prefix}.{name}" if prefix else name
            if attr["returned"] == "always":
                result.append(path)
            if attr["type"] == "complex":
                sub = attr.get("subAttributes") or attr.get("attributes") or []
                _walk(sub, path)
    _walk(schema["attributes"])
    return result


def filter_attributes(resource: dict[str, Any], include_list: list[str]) -> dict[str, Any]:
    result = {}
    for attr in include_list:
        parts = attr.split(".", 1)
        key = parts[0]
        if key not in resource:
            continue

        if len(parts) == 1:
            # top‑level attr
            result[key] = resource[key]
        else:
            # nested attr
            sub = resource[key]
            rest = parts[1]
            if isinstance(sub, dict):
                filtered = filter_attributes(sub, [rest])
                if filtered:
                    result.setdefault(key, {}).update(filtered)
            elif isinstance(sub, list):
                # apply to each element
                new_list = []
                for item in sub:
                    if isinstance(item, dict):
                        f = filter_attributes(item, [rest])
                        if f:
                            new_list.append(f)
                if new_list:
                    result[key] = new_list
    return result


def exclude_attributes(resource: dict[str, Any], exclude_list: list[str]) -> dict[str, Any]:
    exclude_map = {}
    for attr in exclude_list:
        parts = attr.split(".", 1)
        key = parts[0]
        # rest is empty string for top-level exclusion
        rest = parts[1] if len(parts) == 2 else ""
        exclude_map.setdefault(key, []).append(rest)

    new_resource = {}
    for key, value in resource.items():
        if key in exclude_map:
            subs = exclude_map[key]
            # If any attr has no rest, exclude entire key
            if "" in subs:
                continue
            # Exclude nested attributes
            if isinstance(value, dict):
                new_sub = exclude_attributes(value, subs)
                if not new_sub:
                    continue
                new_resource[key] = new_sub
            elif isinstance(value, list):
                new_list = []
                for item in value:
                    if isinstance(item, dict):
                        new_item = exclude_attributes(item, subs)
                        new_list.append(new_item)
                    else:
                        new_list.append(item)
                new_resource[key] = new_list
            else:
                new_resource[key] = value
        else:
            # No exclusion for this key: copy safely
            if isinstance(value, (dict, list)):
                new_resource[key] = deepcopy(value)
            else:
                new_resource[key] = value
    return new_resource
