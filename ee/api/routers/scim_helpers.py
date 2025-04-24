from typing import Any
from copy import deepcopy
import re


def convert_query_str_to_list(query_str: str | None) -> list[str]:
    if query_str is None:
        return None
    return query_str.split(",")


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
                    # note(jon): `item` should always be a dict here
                    new_item = exclude_attributes(item, subs)
                    new_list.append(new_item)
                new_resource[key] = new_list
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

    return valid_changes


def apply_scim_patch(
    operations: list[dict[str, Any]], resource: dict[str, Any], schema: dict[str, Any]
) -> dict[str, Any]:
    """
    Apply SCIM patch operations to a resource based on schema.
    Returns (updated_resource, changes) where `updated_resource` is the new SCIM
    resource dict and `changes` maps attribute or path to (old_value, new_value).
    Additions have old_value=None if attribute didn't exist; removals have new_value=None.
    For add/remove on list-valued attributes, changes record the full list before/after.
    """
    # Deep copy to avoid mutating original
    updated = deepcopy(resource)
    changes = {}

    # Allowed attributes from schema
    allowed_attrs = {attr["name"]: attr for attr in schema.get("attributes", [])}

    for op in operations:
        op_type = op.get("op", "").strip().lower()
        path = op.get("path")
        value = op.get("value")

        if not path:
            # Top-level merge
            if op_type in ("add", "replace"):
                if not isinstance(value, dict):
                    raise ValueError(
                        "When path is not provided, value must be a dict of attributes to merge."
                    )
                for attr, val in value.items():
                    if attr not in allowed_attrs:
                        raise ValueError(
                            f"Attribute '{attr}' not defined in SCIM schema"
                        )
                    old = updated.get(attr)
                    updated[attr] = val if val is not None else updated.pop(attr, None)
                    changes[attr] = (old, val)
            else:
                raise ValueError(f"Unsupported operation without path: {op_type}")
            continue

        tokens = parse_scim_path(path)

        # Detect simple top-level list add/remove
        if (
            op_type in ("add", "remove")
            and len(tokens) == 1
            and isinstance(tokens[0], str)
        ):
            attr = tokens[0]
            if attr not in allowed_attrs:
                raise ValueError(f"Attribute '{attr}' not defined in SCIM schema")
            current_list = updated.get(attr, [])
            if isinstance(current_list, list):
                before = deepcopy(current_list)
                if op_type == "add":
                    # Ensure list exists
                    updated.setdefault(attr, [])
                    # Append new items
                    items = value if isinstance(value, list) else [value]
                    updated[attr].extend(items)
                else:  # remove
                    # Remove items matching filter if value not provided
                    # For remove on list without filter, remove all values equal to value
                    if value is None:
                        updated.pop(attr, None)
                    else:
                        # filter value items out
                        items = value if isinstance(value, list) else [value]
                        updated[attr] = [
                            e for e in updated.get(attr, []) if e not in items
                        ]
                after = deepcopy(updated.get(attr, []))
                changes[attr] = (before, after)
                continue

        # For other operations, get old value and apply normally
        old_val = get_by_path(updated, tokens)

        if op_type == "add":
            set_by_path(updated, tokens, value)
        elif op_type == "replace":
            if value is None:
                remove_by_path(updated, tokens)
            else:
                set_by_path(updated, tokens, value)
        elif op_type == "remove":
            remove_by_path(updated, tokens)
        else:
            raise ValueError(f"Unsupported operation type: {op_type}")

        # Record change for non-list or nested paths
        new_val = None if op_type == "remove" else get_by_path(updated, tokens)
        changes[path] = (old_val, new_val)

    return updated, changes


def parse_scim_path(path):
    """
    Parse a SCIM-style path (e.g., 'emails[type eq "work"].value') into a list
    of tokens. Each token is either a string attribute name or a tuple
    (attr, filter_attr, filter_value) for list-filtering.
    """
    tokens = []
    # Regex matches segments like attr or attr[filter] where filter is e.g. type eq "work"
    segment_re = re.compile(r"([^\.\[]+)(?:\[(.*?)\])?")
    for match in segment_re.finditer(path):
        attr = match.group(1)
        filt = match.group(2)
        if filt:
            # Support simple equality filter of form: subAttr eq "value"
            m = re.match(r"\s*(\w+)\s+eq\s+\"([^\"]+)\"", filt)
            if not m:
                raise ValueError(f"Unsupported filter expression: {filt}")
            filter_attr, filter_val = m.group(1), m.group(2)
            tokens.append((attr, filter_attr, filter_val))
        else:
            tokens.append(attr)
    return tokens


def get_by_path(doc, tokens):
    """
    Retrieve a value from nested dicts/lists using parsed tokens.
    Returns None if any step is missing.
    """
    cur = doc
    for token in tokens:
        if cur is None:
            return None
        if isinstance(token, tuple):
            attr, fattr, fval = token
            lst = cur.get(attr)
            if not isinstance(lst, list):
                return None
            # Find first dict element matching filter
            for elem in lst:
                if isinstance(elem, dict) and elem.get(fattr) == fval:
                    cur = elem
                    break
            else:
                return None
        else:
            if isinstance(cur, dict):
                cur = cur.get(token)
            elif isinstance(cur, list) and isinstance(token, int):
                if 0 <= token < len(cur):
                    cur = cur[token]
                else:
                    return None
            else:
                return None
    return cur


def set_by_path(doc, tokens, value):
    """
    Set a value in nested dicts/lists using parsed tokens.
    Creates intermediate dicts/lists as needed.
    """
    cur = doc
    for i, token in enumerate(tokens):
        last = i == len(tokens) - 1
        if isinstance(token, tuple):
            attr, fattr, fval = token
            lst = cur.setdefault(attr, [])
            if not isinstance(lst, list):
                raise ValueError(f"Expected list at attribute '{attr}'")
            # Find existing entry
            idx = next(
                (
                    j
                    for j, e in enumerate(lst)
                    if isinstance(e, dict) and e.get(fattr) == fval
                ),
                None,
            )
            if idx is None:
                if last:
                    lst.append(value)
                    return
                else:
                    new = {}
                    lst.append(new)
                    cur = new
            else:
                if last:
                    lst[idx] = value
                    return
                cur = lst[idx]

        else:
            if last:
                if value is None:
                    if isinstance(cur, dict):
                        cur.pop(token, None)
                else:
                    cur[token] = value
            else:
                cur = cur.setdefault(token, {})


def remove_by_path(doc, tokens):
    """
    Remove a value in nested dicts/lists using parsed tokens.
    Does nothing if path not present.
    """
    cur = doc
    for i, token in enumerate(tokens):
        last = i == len(tokens) - 1
        if isinstance(token, tuple):
            attr, fattr, fval = token
            lst = cur.get(attr)
            if not isinstance(lst, list):
                return
            for j, elem in enumerate(lst):
                if isinstance(elem, dict) and elem.get(fattr) == fval:
                    if last:
                        lst.pop(j)
                        return
                    cur = elem
                    break
            else:
                return
        else:
            if last:
                if isinstance(cur, dict):
                    cur.pop(token, None)
                elif isinstance(cur, list) and isinstance(token, int):
                    if 0 <= token < len(cur):
                        cur.pop(token)
                return
            else:
                if isinstance(cur, dict):
                    cur = cur.get(token)
                elif isinstance(cur, list) and isinstance(token, int):
                    cur = cur[token] if 0 <= token < len(cur) else None
                else:
                    return
