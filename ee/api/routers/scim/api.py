import logging
from copy import deepcopy
from enum import Enum

from decouple import config
from fastapi import Depends, HTTPException, Header, Query, Response, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from psycopg2 import errors

from chalicelib.core import roles, tenants
from chalicelib.utils.scim_auth import (
    auth_optional,
    auth_required,
    create_tokens,
    verify_refresh_token,
)
from routers.base import get_routers
from routers.scim.constants import (
    SERVICE_PROVIDER_CONFIG,
    RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS,
    SCHEMA_IDS_TO_SCHEMA_DETAILS,
)
from routers.scim import helpers, groups, users
from routers.scim.resource_config import ResourceConfig
from routers.scim import resource_config as api_helper


logger = logging.getLogger(__name__)

public_app, app, app_apikey = get_routers(prefix="/sso/scim/v2")


@public_app.post("/token")
async def post_token(
    host: str = Header(..., alias="Host"),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    subdomain = host.split(".")[0]

    # Missing authentication part, to add
    if form_data.username != config("SCIM_USER") or form_data.password != config(
        "SCIM_PASSWORD"
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tenant = tenants.get_by_name(subdomain)
    access_token, refresh_token = create_tokens(tenant_id=tenant["tenantId"])

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
    }


class RefreshRequest(BaseModel):
    refresh_token: str


@public_app.post("/refresh")
async def post_refresh(r: RefreshRequest):
    payload = verify_refresh_token(r.refresh_token)
    new_access_token, _ = create_tokens(tenant_id=payload["tenant_id"])
    return {"access_token": new_access_token, "token_type": "Bearer"}


def _not_found_error_response(resource_id: int):
    return JSONResponse(
        status_code=404,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": f"Resource {resource_id} not found",
            "status": "404",
        },
    )


def _uniqueness_error_response():
    return JSONResponse(
        status_code=409,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "One or more of the attribute values are already in use or are reserved.",
            "status": "409",
            "scimType": "uniqueness",
        },
    )


def _mutability_error_response():
    return JSONResponse(
        status_code=400,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "The attempted modification is not compatible with the target attribute's mutability or current state.",
            "status": "400",
            "scimType": "mutability",
        },
    )


def _operation_not_permitted_error_response():
    return JSONResponse(
        status_code=403,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "Operation is not permitted based on the supplied authorization",
            "status": "403",
        },
    )


def _invalid_value_error_response():
    return JSONResponse(
        status_code=400,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "A required value was missing, or the value specified was not compatible with the operation or attribtue type, or resource schema.",
            "status": "400",
            "scimType": "invalidValue",
        },
    )


def _internal_server_error_response(detail: str):
    return JSONResponse(
        status_code=500,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": detail,
            "status": "500",
        },
    )


# note(jon): it was recommended to make this endpoint partially open
# so that clients can view the `authenticationSchemes` prior to being authenticated.
@public_app.get("/ServiceProviderConfig")
async def get_service_provider_config(
    r: Request, tenant_id: str | None = Depends(auth_optional)
):
    is_authenticated = tenant_id is not None
    if not is_authenticated:
        return JSONResponse(
            status_code=200,
            content={
                "schemas": SERVICE_PROVIDER_CONFIG["schemas"],
                "authenticationSchemes": SERVICE_PROVIDER_CONFIG[
                    "authenticationSchemes"
                ],
                "meta": SERVICE_PROVIDER_CONFIG["meta"],
            },
        )
    return JSONResponse(status_code=200, content=SERVICE_PROVIDER_CONFIG)


@public_app.get("/ResourceTypes", dependencies=[Depends(auth_required)])
async def get_resource_types(filter_param: str | None = Query(None, alias="filter")):
    if filter_param is not None:
        return _operation_not_permitted_error_response()
    return JSONResponse(
        status_code=200,
        content={
            "totalResults": len(RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS),
            "itemsPerPage": len(RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS),
            "startIndex": 1,
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "Resources": list(RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS.values()),
        },
    )


@public_app.get("/ResourceTypes/{resource_id}", dependencies=[Depends(auth_required)])
async def get_resource_type(resource_id: str):
    if resource_id not in RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS:
        return _not_found_error_response(resource_id)
    return JSONResponse(
        status_code=200,
        content=RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS[resource_id],
    )


@public_app.get("/Schemas", dependencies=[Depends(auth_required)])
async def get_schemas(filter_param: str | None = Query(None, alias="filter")):
    if filter_param is not None:
        return _operation_not_permitted_error_response()
    return JSONResponse(
        status_code=200,
        content={
            "totalResults": len(SCHEMA_IDS_TO_SCHEMA_DETAILS),
            "itemsPerPage": len(SCHEMA_IDS_TO_SCHEMA_DETAILS),
            "startIndex": 1,
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "Resources": [
                value for _, value in sorted(SCHEMA_IDS_TO_SCHEMA_DETAILS.items())
            ],
        },
    )


@public_app.get("/Schemas/{schema_id}")
async def get_schema(schema_id: str, tenant_id=Depends(auth_required)):
    if schema_id not in SCHEMA_IDS_TO_SCHEMA_DETAILS:
        return _not_found_error_response(schema_id)
    schema = deepcopy(SCHEMA_IDS_TO_SCHEMA_DETAILS[schema_id])
    if schema_id == "urn:ietf:params:scim:schemas:core:2.0:User":
        db_roles = roles.get_roles(tenant_id)
        role_names = [role["name"] for role in db_roles]
        user_type_attribute = next(
            filter(lambda x: x["name"] == "userType", schema["attributes"])
        )
        user_type_attribute["canonicalValues"] = role_names
    return JSONResponse(
        status_code=200,
        content=schema,
    )


user_config = ResourceConfig(
    schema_id="urn:ietf:params:scim:schemas:core:2.0:User",
    max_chunk_size=10,
    get_active_resource_count=users.get_active_resource_count,
    convert_provider_resource_to_client_resource=users.convert_provider_resource_to_client_resource,
    get_provider_resource_chunk=users.get_provider_resource_chunk,
    get_provider_resource=users.get_provider_resource,
    convert_client_resource_creation_input_to_provider_resource_creation_input=users.convert_client_resource_creation_input_to_provider_resource_creation_input,
    get_provider_resource_from_unique_fields=users.get_provider_resource_from_unique_fields,
    restore_provider_resource=users.restore_provider_resource,
    create_provider_resource=users.create_provider_resource,
    delete_provider_resource=users.delete_provider_resource,
    convert_client_resource_rewrite_input_to_provider_resource_rewrite_input=users.convert_client_resource_rewrite_input_to_provider_resource_rewrite_input,
    rewrite_provider_resource=users.rewrite_provider_resource,
    convert_client_resource_update_input_to_provider_resource_update_input=users.convert_client_resource_update_input_to_provider_resource_update_input,
    update_provider_resource=users.update_provider_resource,
)
group_config = ResourceConfig(
    schema_id="urn:ietf:params:scim:schemas:core:2.0:Group",
    max_chunk_size=10,
    get_active_resource_count=groups.get_active_resource_count,
    convert_provider_resource_to_client_resource=groups.convert_provider_resource_to_client_resource,
    get_provider_resource_chunk=groups.get_provider_resource_chunk,
    get_provider_resource=groups.get_provider_resource,
    convert_client_resource_creation_input_to_provider_resource_creation_input=groups.convert_client_resource_creation_input_to_provider_resource_creation_input,
    get_provider_resource_from_unique_fields=groups.get_provider_resource_from_unique_fields,
    restore_provider_resource=None,
    create_provider_resource=groups.create_provider_resource,
    delete_provider_resource=groups.delete_provider_resource,
    convert_client_resource_rewrite_input_to_provider_resource_rewrite_input=groups.convert_client_resource_rewrite_input_to_provider_resource_rewrite_input,
    rewrite_provider_resource=groups.rewrite_provider_resource,
    convert_client_resource_update_input_to_provider_resource_update_input=groups.convert_client_resource_update_input_to_provider_resource_update_input,
    update_provider_resource=groups.update_provider_resource,
)

RESOURCE_TYPE_TO_RESOURCE_CONFIG: dict[str, ResourceConfig] = {
    "Users": user_config,
    "Groups": group_config,
}


class SCIMResource(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.get("/{resource_type}")
async def get_resources(
    resource_type: SCIMResource,
    tenant_id=Depends(auth_required),
    requested_start_index_one_indexed: int = Query(1, alias="startIndex"),
    requested_items_per_page: int | None = Query(None, alias="count"),
    attributes: str | None = Query(None),
    excluded_attributes: str | None = Query(None, alias="excludedAttributes"),
):
    config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    total_resources = config.get_active_resource_count(tenant_id)
    start_index_one_indexed = max(1, requested_start_index_one_indexed)
    offset = start_index_one_indexed - 1
    limit = min(
        max(0, requested_items_per_page or config.max_chunk_size), config.max_chunk_size
    )
    provider_resources = config.get_provider_resource_chunk(offset, tenant_id, limit)
    client_resources = [
        api_helper.convert_provider_resource_to_client_resource(
            config, provider_resource, attributes, excluded_attributes
        )
        for provider_resource in provider_resources
    ]
    return JSONResponse(
        status_code=200,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "totalResults": total_resources,
            "startIndex": start_index_one_indexed,
            "itemsPerPage": len(client_resources),
            "Resources": client_resources,
        },
    )


@public_app.get("/{resource_type}/{resource_id}")
async def get_resource(
    resource_type: SCIMResource,
    resource_id: int | str,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    resource = api_helper.get_resource(
        resource_config,
        resource_id,
        tenant_id,
        attributes,
        excluded_attributes,
    )
    if not resource:
        return _not_found_error_response(resource_id)
    return JSONResponse(status_code=200, content=resource)


@public_app.post("/{resource_type}")
async def create_resource(
    resource_type: SCIMResource,
    r: Request,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    payload = await r.json()
    try:
        provider_resource_input = config.convert_client_resource_creation_input_to_provider_resource_creation_input(
            tenant_id,
            payload,
        )
    except KeyError:
        return _invalid_value_error_response()
    existing_provider_resource = config.get_provider_resource_from_unique_fields(
        **provider_resource_input
    )
    if (
        existing_provider_resource
        and existing_provider_resource.get("deleted_at") is None
    ):
        return _uniqueness_error_response()
    if (
        existing_provider_resource
        and existing_provider_resource.get("deleted_at") is not None
    ):
        provider_resource = config.restore_provider_resource(
            tenant_id=tenant_id, **provider_resource_input
        )
    else:
        provider_resource = config.create_provider_resource(
            tenant_id=tenant_id, **provider_resource_input
        )
    client_resource = api_helper.convert_provider_resource_to_client_resource(
        config, provider_resource, attributes, excluded_attributes
    )
    response = JSONResponse(status_code=201, content=client_resource)
    response.headers["Location"] = client_resource["meta"]["location"]
    return response


@public_app.delete("/{resource_type}/{resource_id}")
async def delete_resource(
    resource_type: SCIMResource,
    resource_id: str,
    tenant_id=Depends(auth_required),
):
    # note(jon): this can be a soft or a hard delete
    config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    resource = api_helper.get_resource(config, resource_id, tenant_id)
    if not resource:
        return _not_found_error_response(resource_id)
    config.delete_provider_resource(resource_id, tenant_id)
    return Response(status_code=204, content="")


@public_app.put("/{resource_type}/{resource_id}")
async def put_resource(
    resource_type: SCIMResource,
    resource_id: str,
    r: Request,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    client_resource = api_helper.get_resource(config, resource_id, tenant_id)
    if not client_resource:
        return _not_found_error_response(resource_id)
    schema = api_helper.get_schema(config)
    payload = await r.json()
    try:
        client_resource_input = helpers.filter_mutable_attributes(
            schema, payload, client_resource
        )
    except ValueError:
        return _mutability_error_response()
    provider_resource_input = (
        config.convert_client_resource_rewrite_input_to_provider_resource_rewrite_input(
            tenant_id, client_resource_input
        )
    )
    try:
        provider_resource = config.rewrite_provider_resource(
            resource_id,
            tenant_id,
            **provider_resource_input,
        )
    except errors.UniqueViolation:
        return _uniqueness_error_response()
    except Exception as e:
        return _internal_server_error_response(str(e))
    client_resource = api_helper.convert_provider_resource_to_client_resource(
        config, provider_resource, attributes, excluded_attributes
    )
    return JSONResponse(status_code=200, content=client_resource)


@public_app.patch("/{resource_type}/{resource_id}")
async def patch_resource(
    resource_type: SCIMResource,
    resource_id: str,
    r: Request,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    client_resource = api_helper.get_resource(config, resource_id, tenant_id)
    if not client_resource:
        return _not_found_error_response(resource_id)
    schema = api_helper.get_schema(config)
    payload = await r.json()
    _, changes = helpers.apply_scim_patch(
        payload["Operations"], client_resource, schema
    )
    client_resource_input = {
        k: new_value for k, (old_value, new_value) in changes.items()
    }
    provider_resource_input = (
        config.convert_client_resource_update_input_to_provider_resource_update_input(
            tenant_id, client_resource_input
        )
    )
    try:
        provider_resource = config.update_provider_resource(
            resource_id, tenant_id, **provider_resource_input
        )
    except errors.UniqueViolation:
        return _uniqueness_error_response()
    except Exception as e:
        return _internal_server_error_response(str(e))
    client_resource = api_helper.convert_provider_resource_to_client_resource(
        config, provider_resource, attributes, excluded_attributes
    )
    return JSONResponse(status_code=200, content=client_resource)
