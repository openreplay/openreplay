# note(jon): please see https://datatracker.ietf.org/doc/html/rfc7643 for details on these constants
import json

SCHEMAS = sorted(
    [
        json.load(
            open("routers/scim/fixtures/service_provider_config_schema.json", "r")
        ),
        json.load(open("routers/scim/fixtures/resource_type_schema.json", "r")),
        json.load(open("routers/scim/fixtures/schema_schema.json", "r")),
        json.load(open("routers/scim/fixtures/user_schema.json", "r")),
        json.load(open("routers/scim/fixtures/group_schema.json", "r")),
    ],
    key=lambda x: x["id"],
)

SCHEMA_IDS_TO_SCHEMA_DETAILS = {
    schema_detail["id"]: schema_detail for schema_detail in SCHEMAS
}

SERVICE_PROVIDER_CONFIG = json.load(
    open("routers/scim/fixtures/service_provider_config.json", "r")
)

RESOURCE_TYPES = sorted(
    json.load(open("routers/scim/fixtures/resource_type.json", "r")),
    key=lambda x: x["id"],
)

RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS = {
    resource_type_detail["id"]: resource_type_detail
    for resource_type_detail in RESOURCE_TYPES
}
