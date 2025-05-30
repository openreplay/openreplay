from dataclasses import dataclass
from typing import Any, Callable

from routers.scim.constants import (
    SCHEMA_IDS_TO_SCHEMA_DETAILS,
    RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS,
)
from routers.scim import helpers


Schema = dict[str, Any]
ProviderResource = dict[str, Any]
ClientResource = dict[str, Any]
ResourceId = int | str
ClientInput = dict[str, Any]
ProviderInput = dict[str, Any]


@dataclass
class ResourceConfig:
    resource_type_id: str
    max_chunk_size: int
    get_active_resource_count: Callable[[int], int]
    convert_provider_resource_to_client_resource: Callable[
        [ProviderResource], ClientResource
    ]
    get_provider_resource_chunk: Callable[[int, int, int], list[ProviderResource]]
    get_provider_resource: Callable[[ResourceId, int], ProviderResource | None]
    convert_client_resource_creation_input_to_provider_resource_creation_input: (
        Callable[[int, ClientInput], ProviderInput]
    )
    get_provider_resource_from_unique_fields: Callable[..., ProviderResource | None]
    restore_provider_resource: Callable[..., ProviderResource] | None
    create_provider_resource: Callable[..., ProviderResource]
    delete_provider_resource: Callable[[ResourceId, int], None]
    convert_client_resource_rewrite_input_to_provider_resource_rewrite_input: Callable[
        [int, ClientInput], ProviderInput
    ]
    rewrite_provider_resource: Callable[..., ProviderResource]
    convert_client_resource_update_input_to_provider_resource_update_input: Callable[
        [int, ClientInput], ProviderInput
    ]
    update_provider_resource: Callable[..., ProviderResource]
    filter_attribute_mapping: Callable[None, dict[str, str]]


def get_schema(config: ResourceConfig) -> Schema:
    resource_type_id = config.resource_type_id
    resource_type = RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS[resource_type_id]
    main_schema_id = resource_type["schema"]
    schema_extension_ids = [
        item["schema"] for item in resource_type["schemaExtensions"]
    ]
    result = SCHEMA_IDS_TO_SCHEMA_DETAILS[main_schema_id]
    for schema_id in schema_extension_ids:
        result["attributes"].extend(
            SCHEMA_IDS_TO_SCHEMA_DETAILS[schema_id]["attributes"]
        )
    result["schemas"] = [main_schema_id, *schema_extension_ids]
    return result


def convert_provider_resource_to_client_resource(
    config: ResourceConfig,
    provider_resource: ProviderResource,
    attributes_query_str: str | None,
    excluded_attributes_query_str: str | None,
) -> ClientResource:
    client_resource = config.convert_provider_resource_to_client_resource(
        provider_resource
    )
    schema = get_schema(config)
    client_resource = helpers.filter_attributes(
        client_resource, attributes_query_str, excluded_attributes_query_str, schema
    )
    return client_resource


def get_resource(
    config: ResourceConfig,
    resource_id: ResourceId,
    tenant_id: int,
    attributes: str | None = None,
    excluded_attributes: str | None = None,
) -> ClientResource | None:
    provider_resource = config.get_provider_resource(resource_id, tenant_id)
    if provider_resource is None:
        return None
    client_resource = convert_provider_resource_to_client_resource(
        config, provider_resource, attributes, excluded_attributes
    )
    return client_resource
