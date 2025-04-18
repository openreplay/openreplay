# note(jon): please see https://datatracker.ietf.org/doc/html/rfc7643 for details on these constants
import json

SCHEMAS = sorted(
    [
        json.load(open("routers/fixtures/service_provider_config_schema.json", "r")),
        json.load(open("routers/fixtures/resource_type_schema.json", "r")),
        json.load(open("routers/fixtures/schema_schema.json", "r")),
        json.load(open("routers/fixtures/user_schema.json", "r")),
        # todo(jon): add this when we have groups
        # json.load(open("routers/schemas/group_schema.json", "r")),
    ],
    key=lambda x: x["id"],
)

SERVICE_PROVIDER_CONFIG = json.load(
    open("routers/fixtures/service_provider_config.json", "r")
)

RESOURCE_TYPES = sorted(
    json.load(open("routers/fixtures/resource_type.json", "r")),
    key=lambda x: x["id"],
)
