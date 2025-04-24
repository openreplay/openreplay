from copy import deepcopy
import logging
from typing import Any, Callable
from enum import Enum
from datetime import datetime

from decouple import config
from fastapi import Depends, HTTPException, Header, Query, Response, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from psycopg2 import errors

from chalicelib.core import users, roles, tenants
from chalicelib.utils.scim_auth import (
    auth_optional,
    auth_required,
    create_tokens,
    verify_refresh_token,
)
from routers.base import get_routers
from routers.scim_constants import RESOURCE_TYPES, SCHEMAS, SERVICE_PROVIDER_CONFIG
from routers import scim_helpers, scim_groups


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


RESOURCE_TYPE_IDS_TO_RESOURCE_TYPE_DETAILS = {
    resource_type_detail["id"]: resource_type_detail
    for resource_type_detail in RESOURCE_TYPES
}


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


SCHEMA_IDS_TO_SCHEMA_DETAILS = {
    schema_detail["id"]: schema_detail for schema_detail in SCHEMAS
}


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


def _serialize_db_resource_to_scim_resource_with_attribute_awareness(
    db_resource: dict[str, Any],
    schema_id: str,
    serialize_db_resource_to_scim_resource: Callable[[dict[str, Any]], dict[str, Any]],
    attributes: list[str] | None = None,
    excluded_attributes: list[str] | None = None,
) -> dict[str, Any]:
    schema = SCHEMA_IDS_TO_SCHEMA_DETAILS[schema_id]
    all_attributes = scim_helpers.get_all_attribute_names(schema)
    attributes = attributes or all_attributes
    always_returned_attributes = (
        scim_helpers.get_all_attribute_names_where_returned_is_always(schema)
    )
    included_attributes = list(set(attributes).union(set(always_returned_attributes)))
    excluded_attributes = excluded_attributes or []
    excluded_attributes = list(
        set(excluded_attributes).difference(set(always_returned_attributes))
    )
    scim_resource = serialize_db_resource_to_scim_resource(db_resource)
    scim_resource = scim_helpers.filter_attributes(scim_resource, included_attributes)
    scim_resource = scim_helpers.exclude_attributes(scim_resource, excluded_attributes)
    return scim_resource


def _parse_scim_user_input(data: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    role_id = None
    if "userType" in data:
        role = roles.get_role_by_name(tenant_id, data["userType"])
        role_id = role["roleId"] if role else None
    name = data.get("name", {}).get("formatted")
    if not name:
        name = " ".join(
            [
                x
                for x in [
                    data.get("name", {}).get("honorificPrefix"),
                    data.get("name", {}).get("givenName"),
                    data.get("name", {}).get("middleName"),
                    data.get("name", {}).get("familyName"),
                    data.get("name", {}).get("honorificSuffix"),
                ]
                if x
            ]
        )
    result = {
        "email": data["userName"],
        "internal_id": data.get("externalId"),
        "name": name,
        "role_id": role_id,
    }
    result = {k: v for k, v in result.items() if v is not None}
    return result


def _parse_user_patch_payload(data: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    result = {}
    if "userType" in data:
        role = roles.get_role_by_name(tenant_id, data["userType"])
        result["role_id"] = role["roleId"] if role else None
    if "name" in data:
        # note(jon): we're currently not handling the case where the client
        # send patches of individual name components (e.g. name.middleName)
        name = data.get("name", {}).get("formatted")
        if name:
            result["name"] = name
    if "userName" in data:
        result["email"] = data["userName"]
    if "externalId" in data:
        result["internal_id"] = data["externalId"]
    if "active" in data:
        result["deleted_at"] = None if data["active"] else datetime.now()
    return result


def _serialize_db_user_to_scim_user(db_user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(db_user["userId"]),
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "meta": {
            "resourceType": "User",
            "created": db_user["createdAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": db_user["updatedAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "location": f"Users/{db_user['userId']}",
        },
        "userName": db_user["email"],
        "externalId": db_user["internalId"],
        "name": {
            "formatted": db_user["name"],
        },
        "displayName": db_user["name"] or db_user["email"],
        "userType": db_user.get("roleName"),
        "active": db_user["deletedAt"] is None,
    }


def _serialize_db_group_to_scim_group(db_resource: dict[str, Any]) -> dict[str, Any]:
    members = db_resource["users"] or []
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
        "id": str(db_resource["groupId"]),
        "externalId": db_resource["externalId"],
        "meta": {
            "resourceType": "Group",
            "created": db_resource["createdAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": db_resource["updatedAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "location": f"Groups/{db_resource['groupId']}",
        },
        "displayName": db_resource["name"],
        "members": [
            {
                "value": str(member["userId"]),
                "$ref": f"Users/{member['userId']}",
                "type": "User",
            }
            for member in members
        ],
    }


def _parse_scim_group_input(data: dict[str, Any], tenant_id: int) -> dict[str, Any]:
    return {
        "name": data["displayName"],
        "external_id": data.get("externalId"),
        "user_ids": [int(member["value"]) for member in data.get("members", [])],
    }


def _parse_scim_group_patch(data: dict[str, Any], tenant_id: int) -> dict[str, Any]:
    result = {}
    if "displayName" in data:
        result["name"] = data["displayName"]
    if "externalId" in data:
        result["external_id"] = data["externalId"]
    if "members" in data:
        members = data["members"] or []
        result["user_ids"] = [int(member["value"]) for member in members]
    return result


RESOURCE_TYPE_TO_RESOURCE_CONFIG = {
    "Users": {
        "max_items_per_page": 10,
        "schema_id": "urn:ietf:params:scim:schemas:core:2.0:User",
        "db_to_scim_serializer": _serialize_db_user_to_scim_user,
        "count_total_resources": users.count_total_scim_users,
        "get_paginated_resources": users.get_scim_users_paginated,
        "get_unique_resource": users.get_scim_user_by_id,
        "parse_post_payload": _parse_scim_user_input,
        "get_resource_by_unique_values": users.get_existing_scim_user_by_unique_values_from_all_users,
        "restore_resource": users.restore_scim_user,
        "create_resource": users.create_scim_user,
        "delete_resource": users.soft_delete_scim_user_by_id,
        "parse_put_payload": _parse_scim_user_input,
        "update_resource": users.update_scim_user,
        "parse_patch_payload": _parse_user_patch_payload,
        "patch_resource": users.patch_scim_user,
    },
    "Groups": {
        "max_items_per_page": 10,
        "schema_id": "urn:ietf:params:scim:schemas:core:2.0:Group",
        "db_to_scim_serializer": _serialize_db_group_to_scim_group,
        "count_total_resources": scim_groups.count_total_resources,
        "get_paginated_resources": scim_groups.get_resources_paginated,
        "get_unique_resource": scim_groups.get_resource_by_id,
        "parse_post_payload": _parse_scim_group_input,
        "get_resource_by_unique_values": scim_groups.get_existing_resource_by_unique_values_from_all_resources,
        # note(jon): we're not soft deleting groups, so we don't need this
        "restore_resource": None,
        "create_resource": scim_groups.create_resource,
        "delete_resource": scim_groups.delete_resource,
        "parse_put_payload": _parse_scim_group_input,
        "update_resource": scim_groups.update_resource,
        "parse_patch_payload": _parse_scim_group_patch,
        "patch_resource": scim_groups.patch_resource,
    },
}


class ListResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.get("/{resource_type}")
async def get_resources(
    resource_type: ListResourceType,
    tenant_id=Depends(auth_required),
    requested_start_index: int = Query(1, alias="startIndex"),
    requested_items_per_page: int | None = Query(None, alias="count"),
    attributes: str | None = Query(None),
    excluded_attributes: str | None = Query(None, alias="excludedAttributes"),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    start_index = max(1, requested_start_index)
    max_items_per_page = resource_config["max_items_per_page"]
    items_per_page = min(
        max(0, requested_items_per_page or max_items_per_page), max_items_per_page
    )
    total_resources = resource_config["count_total_resources"](tenant_id)
    db_resources = resource_config["get_paginated_resources"](
        start_index, tenant_id, items_per_page
    )
    attributes = scim_helpers.convert_query_str_to_list(attributes)
    excluded_attributes = scim_helpers.convert_query_str_to_list(excluded_attributes)
    scim_resources = [
        _serialize_db_resource_to_scim_resource_with_attribute_awareness(
            db_resource,
            resource_config["schema_id"],
            resource_config["db_to_scim_serializer"],
            attributes,
            excluded_attributes,
        )
        for db_resource in db_resources
    ]
    return JSONResponse(
        status_code=200,
        content={
            "totalResults": total_resources,
            "startIndex": start_index,
            "itemsPerPage": len(scim_resources),
            "Resources": scim_resources,
        },
    )


class GetResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.get("/{resource_type}/{resource_id}")
async def get_resource(
    resource_type: GetResourceType,
    resource_id: int,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    db_resource = resource_config["get_unique_resource"](resource_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(resource_id)
    scim_resource = _serialize_db_resource_to_scim_resource_with_attribute_awareness(
        db_resource,
        resource_config["schema_id"],
        resource_config["db_to_scim_serializer"],
        attributes,
        excluded_attributes,
    )
    return JSONResponse(status_code=200, content=scim_resource)


class PostResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.post("/{resource_type}")
async def create_resource(
    resource_type: PostResourceType,
    r: Request,
    tenant_id=Depends(auth_required),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    scim_payload = await r.json()
    try:
        db_payload = resource_config["parse_post_payload"](scim_payload, tenant_id)
    except KeyError:
        return _invalid_value_error_response()
    existing_db_resource = resource_config["get_resource_by_unique_values"](
        **db_payload
    )
    if existing_db_resource and existing_db_resource.get("deletedAt") is None:
        return _uniqueness_error_response()
    if existing_db_resource and existing_db_resource.get("deletedAt") is not None:
        db_resource = resource_config["restore_resource"](
            tenant_id=tenant_id, **db_payload
        )
    else:
        db_resource = resource_config["create_resource"](
            tenant_id=tenant_id,
            **db_payload,
        )
    scim_resource = _serialize_db_resource_to_scim_resource_with_attribute_awareness(
        db_resource,
        resource_config["schema_id"],
        resource_config["db_to_scim_serializer"],
    )
    response = JSONResponse(status_code=201, content=scim_resource)
    response.headers["Location"] = scim_resource["meta"]["location"]
    return response


class DeleteResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.delete("/{resource_type}/{resource_id}")
async def delete_resource(
    resource_type: DeleteResourceType,
    resource_id: str,
    tenant_id=Depends(auth_required),
):
    # note(jon): this can be a soft or a hard delete
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    db_resource = resource_config["get_unique_resource"](resource_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(resource_id)
    resource_config["delete_resource"](resource_id, tenant_id)
    return Response(status_code=204, content="")


class PutResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.put("/{resource_type}/{resource_id}")
async def put_resource(
    resource_type: PutResourceType,
    resource_id: str,
    r: Request,
    tenant_id=Depends(auth_required),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    db_resource = resource_config["get_unique_resource"](resource_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(resource_id)
    current_scim_resource = (
        _serialize_db_resource_to_scim_resource_with_attribute_awareness(
            db_resource,
            resource_config["schema_id"],
            resource_config["db_to_scim_serializer"],
        )
    )
    requested_scim_changes = await r.json()
    schema = SCHEMA_IDS_TO_SCHEMA_DETAILS[resource_config["schema_id"]]
    try:
        valid_mutable_scim_changes = scim_helpers.filter_mutable_attributes(
            schema, requested_scim_changes, current_scim_resource
        )
    except ValueError:
        return _mutability_error_response()
    valid_mutable_db_changes = resource_config["parse_put_payload"](
        valid_mutable_scim_changes,
        tenant_id,
    )
    try:
        updated_db_resource = resource_config["update_resource"](
            resource_id,
            tenant_id,
            **valid_mutable_db_changes,
        )
        updated_scim_resource = (
            _serialize_db_resource_to_scim_resource_with_attribute_awareness(
                updated_db_resource,
                resource_config["schema_id"],
                resource_config["db_to_scim_serializer"],
            )
        )
        return JSONResponse(status_code=200, content=updated_scim_resource)
    except errors.UniqueViolation:
        return _uniqueness_error_response()
    except Exception as e:
        return _internal_server_error_response(str(e))


class PatchResourceType(str, Enum):
    USERS = "Users"
    GROUPS = "Groups"


@public_app.patch("/{resource_type}/{resource_id}")
async def patch_resource(
    resource_type: PatchResourceType,
    resource_id: str,
    r: Request,
    tenant_id=Depends(auth_required),
):
    resource_config = RESOURCE_TYPE_TO_RESOURCE_CONFIG[resource_type]
    db_resource = resource_config["get_unique_resource"](resource_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(resource_id)
    current_scim_resource = (
        _serialize_db_resource_to_scim_resource_with_attribute_awareness(
            db_resource,
            resource_config["schema_id"],
            resource_config["db_to_scim_serializer"],
        )
    )
    payload = await r.json()
    _, changes = scim_helpers.apply_scim_patch(
        payload["Operations"],
        current_scim_resource,
        SCHEMA_IDS_TO_SCHEMA_DETAILS[resource_config["schema_id"]],
    )
    reformatted_scim_changes = {
        k: new_value for k, (old_value, new_value) in changes.items()
    }
    db_changes = resource_config["parse_patch_payload"](
        reformatted_scim_changes,
        tenant_id,
    )
    updated_db_resource = resource_config["patch_resource"](
        resource_id,
        tenant_id,
        **db_changes,
    )
    updated_scim_resource = (
        _serialize_db_resource_to_scim_resource_with_attribute_awareness(
            updated_db_resource,
            resource_config["schema_id"],
            resource_config["db_to_scim_serializer"],
        )
    )
    return JSONResponse(status_code=200, content=updated_scim_resource)
