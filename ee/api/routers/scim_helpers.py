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


def get_all_attribute_names_where_returned_is_always(
    schema: dict[str, Any],
) -> list[str]:
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


def filter_attributes(
    resource: dict[str, Any], include_list: list[str]
) -> dict[str, Any]:
    result = {}

    # Group include paths by top-level key
    includes_by_key = {}
    for path in include_list:
        parts = path.split(".", 1)
        key = parts[0]
        rest = parts[1] if len(parts) == 2 else None
        includes_by_key.setdefault(key, []).append(rest)

    for key, subpaths in includes_by_key.items():
        if key not in resource:
            continue

        value = resource[key]
        if all(p is None for p in subpaths):
            result[key] = value
        else:
            nested_paths = [p for p in subpaths if p is not None]
            if isinstance(value, dict):
                filtered = filter_attributes(value, nested_paths)
                if filtered:
                    result[key] = filtered
            elif isinstance(value, list):
                new_list = []
                for item in value:
                    if isinstance(item, dict):
                        filtered_item = filter_attributes(item, nested_paths)
                        if filtered_item:
                            new_list.append(filtered_item)
                if new_list:
                    result[key] = new_list
    return result


def exclude_attributes(
    resource: dict[str, Any], exclude_list: list[str]
) -> dict[str, Any]:
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


def filter_mutable_attributes(
    schema: dict[str, Any],
    requested_changes: dict[str, Any],
    current_values: dict[str, Any],
) -> dict[str, Any]:
    attributes = {attr.get("name"): attr for attr in schema.get("attributes", [])}

    valid_changes = {}

    for attr_name, new_value in requested_changes.items():
        attr_def = attributes.get(attr_name)
        if not attr_def:
            # Unknown attribute: ignore per RFC 7644
            continue

        mutability = attr_def.get("mutability", "readWrite")

        if mutability == "readWrite" or mutability == "writeOnly":
            valid_changes[attr_name] = new_value

        elif mutability == "readOnly":
            # Cannot modify read-only attributes: ignore
            continue

        elif mutability == "immutable":
            # Only valid if the new value matches the current value exactly
            current_value = current_values.get(attr_name)
            if new_value != current_value:
                raise ValueError(
                    f"Attribute '{attr_name}' is immutable (cannot change). "
                    f"Current value: {current_value!r}, attempted change: {new_value!r}"
                )
            # If it matches, no change is needed (already set)

        else:
            # Unknown mutability: default to safe behavior (ignore)
            continue

    return valid_changes
