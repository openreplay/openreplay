import logging
from typing import Any

from decouple import config
from fastapi import Depends, HTTPException, Header, Query, Response, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from chalicelib.core import users, tenants
from chalicelib.utils.scim_auth import (
    auth_optional,
    auth_required,
    create_tokens,
    verify_refresh_token,
)
from routers.base import get_routers
from routers.scim_constants import RESOURCE_TYPES, SCHEMAS, SERVICE_PROVIDER_CONFIG
from routers import scim_helpers


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


def _not_found_error_response(resource_id: str):
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


@public_app.get("/Schemas/{schema_id}", dependencies=[Depends(auth_required)])
async def get_schema(schema_id: str):
    if schema_id not in SCHEMA_IDS_TO_SCHEMA_DETAILS:
        return _not_found_error_response(schema_id)
    return JSONResponse(
        status_code=200,
        content=SCHEMA_IDS_TO_SCHEMA_DETAILS[schema_id],
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


MAX_USERS_PER_PAGE = 10


def _convert_db_user_to_scim_user(
    db_user: dict[str, Any],
    attributes: list[str] | None = None,
    excluded_attributes: list[str] | None = None,
) -> dict[str, Any]:
    user_schema = SCHEMA_IDS_TO_SCHEMA_DETAILS[
        "urn:ietf:params:scim:schemas:core:2.0:User"
    ]
    all_attributes = scim_helpers.get_all_attribute_names(user_schema)
    attributes = attributes or all_attributes
    always_returned_attributes = (
        scim_helpers.get_all_attribute_names_where_returned_is_always(user_schema)
    )
    included_attributes = list(set(attributes).union(set(always_returned_attributes)))
    excluded_attributes = excluded_attributes or []
    excluded_attributes = list(
        set(excluded_attributes).difference(set(always_returned_attributes))
    )
    scim_user = {
        "id": str(db_user["userId"]),
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "meta": {
            "resourceType": "User",
            "created": db_user["createdAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            # todo(jon): we currently don't keep track of this in the db
            "lastModified": db_user["createdAt"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "location": f"Users/{db_user['userId']}",
        },
        "userName": db_user["email"],
    }
    scim_user = scim_helpers.filter_attributes(scim_user, included_attributes)
    scim_user = scim_helpers.exclude_attributes(scim_user, excluded_attributes)
    return scim_user


@public_app.get("/Users")
async def get_users(
    tenant_id=Depends(auth_required),
    requested_start_index: int = Query(1, alias="startIndex"),
    requested_items_per_page: int | None = Query(None, alias="count"),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    start_index = max(1, requested_start_index)
    items_per_page = min(
        max(0, requested_items_per_page or MAX_USERS_PER_PAGE), MAX_USERS_PER_PAGE
    )
    # todo(jon): this might not be the most efficient thing to do. could be better to just do a count.
    # but this is the fastest thing at the moment just to test that it's working
    total_resources = users.get_users_paginated(1, tenant_id)
    db_resources = users.get_users_paginated(
        start_index, tenant_id, count=items_per_page
    )
    scim_resources = [
        _convert_db_user_to_scim_user(resource, attributes, excluded_attributes)
        for resource in db_resources
    ]
    return JSONResponse(
        status_code=200,
        content={
            "totalResults": len(total_resources),
            "startIndex": start_index,
            "itemsPerPage": len(scim_resources),
            "Resources": scim_resources,
        },
    )


@public_app.get("/Users/{user_id}")
async def get_user(
    user_id: str,
    tenant_id=Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    db_resource = users.get_scim_user_by_id(user_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(user_id)
    scim_resource = _convert_db_user_to_scim_user(
        db_resource, attributes, excluded_attributes
    )
    return JSONResponse(status_code=200, content=scim_resource)


@public_app.post("/Users")
async def create_user(r: Request, tenant_id=Depends(auth_required)):
    payload = await r.json()
    if "userName" not in payload:
        return _invalid_value_error_response()
    # note(jon): this method will return soft deleted users as well
    existing_db_resource = users.get_existing_scim_user_by_unique_values(
        payload["userName"]
    )
    if existing_db_resource and existing_db_resource["deletedAt"] is None:
        return _uniqueness_error_response()
    if existing_db_resource and existing_db_resource["deletedAt"] is not None:
        db_resource = users.restore_scim_user(existing_db_resource["userId"], tenant_id)
    else:
        db_resource = users.create_scim_user(
            email=payload["userName"],
            # note(jon): scim schema does not require the `name.formatted` attribute, but we require `name`.
            # so, we have to define the value ourselves here
            name="",
            tenant_id=tenant_id,
        )
    scim_resource = _convert_db_user_to_scim_user(db_resource)
    response = JSONResponse(status_code=201, content=scim_resource)
    response.headers["Location"] = scim_resource["meta"]["location"]
    return response


@public_app.put("/Users/{user_id}")
async def update_user(user_id: str, r: Request, tenant_id=Depends(auth_required)):
    db_resource = users.get_scim_user_by_id(user_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(user_id)
    current_scim_resource = _convert_db_user_to_scim_user(db_resource)
    changes = await r.json()
    schema = SCHEMA_IDS_TO_SCHEMA_DETAILS["urn:ietf:params:scim:schemas:core:2.0:User"]
    try:
        valid_mutable_changes = scim_helpers.filter_mutable_attributes(
            schema, changes, current_scim_resource
        )
    except ValueError:
        return _mutability_error_response()
    try:
        updated_db_resource = users.update_scim_user(
            user_id,
            tenant_id,
            email=valid_mutable_changes["userName"],
        )
        updated_scim_resource = _convert_db_user_to_scim_user(updated_db_resource)
        return JSONResponse(status_code=200, content=updated_scim_resource)
    except Exception:
        # note(jon): for now, this is the only error that would happen when updating the scim user
        return _uniqueness_error_response()


@public_app.delete("/Users/{user_id}")
async def delete_user(user_id: str, tenant_id=Depends(auth_required)):
    db_resource = users.get_scim_user_by_id(user_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(user_id)
    users.soft_delete_scim_user_by_id(user_id, tenant_id)
    return Response(status_code=204, content="")
