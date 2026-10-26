from decouple import config, Csv

__SCIM_USED = False

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
