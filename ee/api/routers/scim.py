import logging
import re
import uuid
from typing import Any, Literal, Optional
import copy
from datetime import datetime

from decouple import config
from fastapi import Depends, HTTPException, Header, Query, Response, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, field_serializer

import schemas
from chalicelib.core import users, roles, tenants
from chalicelib.utils.scim_auth import auth_optional, auth_required, create_tokens, verify_refresh_token
from routers.base import get_routers
from routers.scim_constants import RESOURCE_TYPES, SCHEMAS, SERVICE_PROVIDER_CONFIG
from routers import scim_helpers


logger = logging.getLogger(__name__)

public_app, app, app_apikey = get_routers(prefix="/sso/scim/v2")


"""Authentication endpoints"""

class RefreshRequest(BaseModel):
    refresh_token: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Login endpoint to generate tokens
@public_app.post("/token")
async def login(host: str = Header(..., alias="Host"), form_data: OAuth2PasswordRequestForm = Depends()):
    subdomain = host.split(".")[0]

    # Missing authentication part, to add
    if form_data.username != config("SCIM_USER") or form_data.password != config("SCIM_PASSWORD"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tenant = tenants.get_by_name(subdomain)
    access_token, refresh_token = create_tokens(tenant_id=tenant["tenantId"])

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

# Refresh token endpoint
@public_app.post("/refresh")
async def refresh_token(r: RefreshRequest):

    payload = verify_refresh_token(r.refresh_token)
    new_access_token, _ = create_tokens(tenant_id=payload["tenant_id"])

    return {"access_token": new_access_token, "token_type": "bearer"}


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
        }
    )


def _uniqueness_error_response():
    return JSONResponse(
        status_code=409,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "One or more of the attribute values are already in use or are reserved.",
            "status": "409",
            "scimType": "uniqueness",
        }
    )


def _mutability_error_response():
    return JSONResponse(
        status_code=400,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
            "detail": "The attempted modification is not compatible with the target attribute's mutability or current state.",
            "status": "400",
            "scimType": "mutability",
        }
    )


@public_app.get("/ResourceTypes", dependencies=[Depends(auth_required)])
async def get_resource_types(filter_param: str | None = Query(None, alias="filter")):
    if filter_param is not None:
        return JSONResponse(
            status_code=403,
            content={
                "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
                "detail": "Operation is not permitted based on the supplied authorization",
                "status": "403",
            }
        )
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
    schema_detail["id"]: schema_detail
    for schema_detail in SCHEMAS
}


@public_app.get("/Schemas", dependencies=[Depends(auth_required)])
async def get_schemas(filter_param: str | None = Query(None, alias="filter")):
    if filter_param is not None:
        return JSONResponse(
            status_code=403,
            content={
                "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
                "detail": "Operation is not permitted based on the supplied authorization",
                "status": "403",
            }
        )
    return JSONResponse(
        status_code=200,
        content={
            "totalResults": len(SCHEMA_IDS_TO_SCHEMA_DETAILS),
            "itemsPerPage": len(SCHEMA_IDS_TO_SCHEMA_DETAILS),
            "startIndex": 1,
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "Resources": [
                value
                for _, value in sorted(SCHEMA_IDS_TO_SCHEMA_DETAILS.items())
            ]
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
async def get_service_provider_config(r: Request, tenant_id: str | None = Depends(auth_optional)):
    content = copy.deepcopy(SERVICE_PROVIDER_CONFIG)
    content["meta"]["location"] = str(r.url)
    is_authenticated = tenant_id is not None
    if not is_authenticated:
        content = {
            "schemas": content["schemas"],
            "authenticationSchemes": content["authenticationSchemes"],
            "meta": content["meta"],
        }
    return JSONResponse(
        status_code=200,
        content=content,
    )


"""
User endpoints
"""
class UserRequest(BaseModel):
    userName: str


class PatchUserRequest(BaseModel):
    schemas: list[str]
    Operations: list[dict]


class ResourceMetaResponse(BaseModel):
    resourceType: Literal["ServiceProviderConfig", "ResourceType", "Schema", "User"] | None = None
    created: datetime | None = None
    lastModified: datetime | None = None
    location: str | None = None
    version: str | None = None

    @field_serializer("created", "lastModified")
    def serialize_datetime(self, dt: datetime) -> str | None:
        if not dt:
            return None
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class CommonResourceResponse(BaseModel):
    id: str
    externalId: str | None = None
    schemas: list[
        Literal[
            "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
            "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
            "urn:ietf:params:scim:schemas:core:2.0:Schema",
            "urn:ietf:params:scim:schemas:core:2.0:User",
        ]
    ]
    meta: ResourceMetaResponse | None = None


class UserResponse(CommonResourceResponse):
    schemas: list[Literal["urn:ietf:params:scim:schemas:core:2.0:User"]] = ["urn:ietf:params:scim:schemas:core:2.0:User"]
    userName: str | None = None


class QueryResourceResponse(BaseModel):
    schemas: list[Literal["urn:ietf:params:scim:api:messages:2.0:ListResponse"]] = ["urn:ietf:params:scim:api:messages:2.0:ListResponse"]
    totalResults: int
    # todo(jon): add the other schemas
    Resources: list[UserResponse]
    startIndex: int
    itemsPerPage: int


MAX_USERS_PER_PAGE = 10


def _convert_db_user_to_scim_user(db_user: dict[str, Any], attributes: list[str] | None = None, excluded_attributes: list[str] | None = None) -> UserResponse:
    user_schema = SCHEMA_IDS_TO_SCHEMA_DETAILS["urn:ietf:params:scim:schemas:core:2.0:User"]
    all_attributes = scim_helpers.get_all_attribute_names(user_schema)
    attributes = attributes or all_attributes
    always_returned_attributes = scim_helpers.get_all_attribute_names_where_returned_is_always(user_schema)
    included_attributes = list(set(attributes).union(set(always_returned_attributes)))
    excluded_attributes = excluded_attributes or []
    excluded_attributes = list(set(excluded_attributes).difference(set(always_returned_attributes)))
    scim_user = {
        "id": str(db_user["userId"]),
        "meta": {
            "resourceType": "User",
            "created": db_user["createdAt"],
            "lastModified": db_user["createdAt"], # todo(jon): we currently don't keep track of this in the db
            "location": f"Users/{db_user['userId']}"
        },
        "userName": db_user["email"],
    }
    scim_user = scim_helpers.filter_attributes(scim_user, included_attributes)
    scim_user = scim_helpers.exclude_attributes(scim_user, excluded_attributes)
    return UserResponse(**scim_user)


@public_app.get("/Users")
async def get_users(
    tenant_id = Depends(auth_required),
    requested_start_index: int = Query(1, alias="startIndex"),
    requested_items_per_page: int | None = Query(None, alias="count"),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    start_index = max(1, requested_start_index)
    items_per_page = min(max(0, requested_items_per_page or MAX_USERS_PER_PAGE), MAX_USERS_PER_PAGE)
    # todo(jon): this might not be the most efficient thing to do. could be better to just do a count.
    # but this is the fastest thing at the moment just to test that it's working
    total_users = users.get_users_paginated(1, tenant_id)
    db_users = users.get_users_paginated(start_index, tenant_id, count=items_per_page)
    scim_users = [
        _convert_db_user_to_scim_user(user, attributes, excluded_attributes)
        for user in db_users
    ]
    return JSONResponse(
        status_code=200,
        content=QueryResourceResponse(
            totalResults=len(total_users),
            startIndex=start_index,
            itemsPerPage=len(scim_users),
            Resources=scim_users,
        ).model_dump(mode="json", exclude_none=True),
    )


@public_app.get("/Users/{user_id}")
def get_user(
    user_id: str,
    tenant_id = Depends(auth_required),
    attributes: list[str] | None = Query(None),
    excluded_attributes: list[str] | None = Query(None, alias="excludedAttributes"),
):
    db_user = users.get_scim_user_by_id(user_id, tenant_id)
    if not db_user:
        return _not_found_error_response(user_id)
    scim_user = _convert_db_user_to_scim_user(db_user, attributes, excluded_attributes)
    return JSONResponse(
        status_code=200,
        content=scim_user.model_dump(mode="json", exclude_none=True)
    )


@public_app.post("/Users")
async def create_user(r: UserRequest, tenant_id = Depends(auth_required)):
    # note(jon): this method will return soft deleted users as well
    existing_db_user = users.get_existing_scim_user_by_unique_values(r.userName)
    if existing_db_user and existing_db_user["deletedAt"] is None:
        return _uniqueness_error_response()
    if existing_db_user and existing_db_user["deletedAt"] is not None:
        db_user = users.restore_scim_user(existing_db_user["userId"], tenant_id)
    else:
        db_user = users.create_scim_user(
            email=r.userName,
            # note(jon): scim schema does not require the `name.formatted` attribute, but we require `name`.
            # so, we have to define the value ourselves here
            name="",
            tenant_id=tenant_id,
        )
    scim_user = _convert_db_user_to_scim_user(db_user)
    response = JSONResponse(
        status_code=201,
        content=scim_user.model_dump(mode="json", exclude_none=True)
    )
    response.headers["Location"] = scim_user.meta.location
    return response


@public_app.put("/Users/{user_id}")
def update_user(user_id: str, r: UserRequest, tenant_id = Depends(auth_required)):
    db_resource = users.get_scim_user_by_id(user_id, tenant_id)
    if not db_resource:
        return _not_found_error_response(user_id)
    current_scim_resource = _convert_db_user_to_scim_user(db_resource).model_dump(mode="json", exclude_none=True)
    changes = r.model_dump(mode="json")
    schema = SCHEMA_IDS_TO_SCHEMA_DETAILS["urn:ietf:params:scim:schemas:core:2.0:User"]
    try:
        valid_mutable_changes = scim_helpers.filter_mutable_attributes(schema, changes, current_scim_resource)
    except ValueError:
        # todo(jon): will need to add a test for this once we have an immutable field
        return _mutability_error_response()
    try:
        updated_db_resource = users.update_scim_user(
            user_id,
            tenant_id,
            email=valid_mutable_changes["userName"],
        )
        updated_scim_resource = _convert_db_user_to_scim_user(updated_db_resource)
        return JSONResponse(
            status_code=200,
            content=updated_scim_resource.model_dump(mode="json", exclude_none=True),
        )
    except Exception:
        # note(jon): for now, this is the only error that would happen when updating the scim user
        return _uniqueness_error_response()


@public_app.delete("/Users/{user_id}")
def delete_user(user_id: str, tenant_id = Depends(auth_required)):
    user = users.get_scim_user_by_id(user_id, tenant_id)
    if not user:
        return _not_found_error_response(user_id)
    users.soft_delete_scim_user_by_id(user_id, tenant_id)
    return Response(status_code=204, content="")



"""
Group endpoints
"""

class Operation(BaseModel):
    op: str
    path: str = Field(default=None)
    value: list[dict] | dict = Field(default=None)

class GroupGetResponse(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:api:messages:2.0:ListResponse"])
    totalResults: int
    startIndex: int
    itemsPerPage: int
    resources: list = Field(alias="Resources")

class GroupRequest(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:schemas:core:2.0:Group"])
    displayName: str = Field(default=None)
    members: list = Field(default=None)
    operations: list[Operation] = Field(default=None, alias="Operations")

class GroupPatchRequest(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:api:messages:2.0:PatchOp"])
    operations: list[Operation] = Field(alias="Operations")

class GroupResponse(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:schemas:core:2.0:Group"])
    id: str
    displayName: str
    members: list
    meta: dict = Field(default={"resourceType": "Group"})


@public_app.get("/Groups", dependencies=[Depends(auth_required)])
def get_groups(
    start_index: int = Query(1, alias="startIndex"),
    count: Optional[int] = Query(None, alias="count"),
    group_name: Optional[str] = Query(None, alias="filter"),
    ):
    """Get groups"""
    tenant_id = 1
    res = []
    if group_name:
        group_name = group_name.split(" ")[2].strip('"')

    groups = roles.get_roles_with_uuid_paginated(tenant_id, start_index, count, group_name)
    res = [{
            "id": group["data"]["groupId"],
            "meta": {
                "created": group["createdAt"],
                "lastModified": "", # not currently a field
                "version": "v1.0"
            },
            "displayName": group["name"]
        } for group in groups
    ]
    return JSONResponse(
        status_code=200,
        content=GroupGetResponse(
            totalResults=len(groups),
            startIndex=start_index,
            itemsPerPage=len(groups),
            Resources=res
        ).model_dump(mode='json'))

@public_app.get("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def get_group(group_id: str):
    """Get a group by id"""
    tenant_id = 1
    group = roles.get_role_by_group_id(tenant_id, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    members = roles.get_users_by_group_uuid(tenant_id, group["data"]["groupId"])
    members = [{"value": member["data"]["userId"], "display": member["name"]} for member in members]

    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            id=group["data"]["groupId"],
            displayName=group["name"],
            members=members,
    ).model_dump(mode='json'))

@public_app.post("/Groups", dependencies=[Depends(auth_required)])
def create_group(r: GroupRequest):
    """Create a group"""
    tenant_id = 1
    member_role = roles.get_member_permissions(tenant_id)
    try:
        data = schemas.RolePayloadSchema(name=r.displayName, permissions=member_role["permissions"]) # permissions by default are same as for member role
        group = roles.create_as_admin(tenant_id, uuid.uuid4().hex, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    added_members = []
    for member in r.members:
        user = users.get_by_uuid(member["value"], tenant_id)
        if user:
            users.update(tenant_id, user["userId"], {"role_id": group["roleId"]})
            added_members.append({
                "value": user["data"]["userId"],
                "display": user["name"]
            })

    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            id=group["data"]["groupId"],
            displayName=group["name"],
            members=added_members,
    ).model_dump(mode='json'))


@public_app.put("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def update_put_group(group_id: str, r: GroupRequest):
    """Update a group or members of the group (not used by anything yet)"""
    tenant_id = 1
    group = roles.get_role_by_group_id(tenant_id, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if r.operations and r.operations[0].op == "replace" and r.operations[0].path is None:
        roles.update_group_name(tenant_id, group["data"]["groupId"], r.operations[0].value["displayName"])
        return Response(status_code=200, content="")

    members = r.members
    modified_members = []
    for member in members:
        user = users.get_by_uuid(member["value"], tenant_id)
        if user:
            users.update(tenant_id, user["userId"], {"role_id": group["roleId"]})
            modified_members.append({
                "value": user["data"]["userId"],
                "display": user["name"]
            })

    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            id=group_id,
            displayName=group["name"],
            members=modified_members,
    ).model_dump(mode='json'))


@public_app.patch("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def update_patch_group(group_id: str, r: GroupPatchRequest):
    """Update a group or members of the group, used by AIW"""
    tenant_id = 1
    group = roles.get_role_by_group_id(tenant_id, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if r.operations[0].op == "replace" and r.operations[0].path is None:
        roles.update_group_name(tenant_id, group["data"]["groupId"], r.operations[0].value["displayName"])
        return Response(status_code=200, content="")

    modified_members = []
    for op in r.operations:
        if op.op == "add" or op.op == "replace":
            # Both methods work as "replace"
            for u in op.value:
                user = users.get_by_uuid(u["value"], tenant_id)
                if user:
                    users.update(tenant_id, user["userId"], {"role_id": group["roleId"]})
                    modified_members.append({
                        "value": user["data"]["userId"],
                        "display": user["name"]
                    })
        elif op.op == "remove":
            user_id = re.search(r'\[value eq \"([a-f0-9]+)\"\]', op.path).group(1)
            roles.remove_group_membership(tenant_id, group_id, user_id)
    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            id=group_id,
            displayName=group["name"],
            members=modified_members,
    ).model_dump(mode='json'))


@public_app.delete("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def delete_group(group_id: str):
    """Delete a group, hard-delete"""
    # possibly need to set the user's roles to default member role, instead of null
    tenant_id = 1
    group = roles.get_role_by_group_id(tenant_id, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    roles.delete_scim_group(tenant_id, group["data"]["groupId"])

    return Response(status_code=200, content="")
