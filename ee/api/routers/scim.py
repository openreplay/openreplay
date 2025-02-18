import logging
import re
import uuid
from typing import Optional

from decouple import config
from fastapi import Depends, HTTPException, Header, Query, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import schemas
from chalicelib.core import users, roles
from routers.base import get_routers

logger = logging.getLogger(__name__)


public_app, app, app_apikey = get_routers(prefix="/sso/scim/v2")

# Authentication Dependency
def auth_required(authorization: str = Header(..., alias="Authorization")):
    """Dependency to check Authorization header."""
    token = authorization.replace("Bearer ", "")
    if token != config("OCTA_TOKEN"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    return token


"""
User endpoints
"""

class Name(BaseModel):
    givenName: str
    familyName: str

class Email(BaseModel):
    primary: bool
    value: str
    type: str

class UserRequest(BaseModel):
    schemas: list[str]
    userName: str
    name: Name
    emails: list[Email]
    displayName: str
    locale: str
    externalId: str
    groups: list[dict]
    password: str = Field(default=None)
    active: bool

class UserResponse(BaseModel):
    schemas: list[str]
    id: str
    userName: str
    name: Name
    emails: list[Email] # ignore for now
    displayName: str
    locale: str
    externalId: str
    active: bool
    groups: list[dict]
    meta: dict = Field(default={"resourceType": "User"})

class PatchUserRequest(BaseModel):
    schemas: list[str]
    Operations: list[dict]


@public_app.get("/Users", dependencies=[Depends(auth_required)])
async def get_users(
    start_index: int = Query(1, alias="startIndex"),
    count: Optional[int] = Query(None, alias="count"),
    email: Optional[str] = Query(None, alias="filter"),
):
    """Get SCIM Users"""
    if email:
        email = email.split(" ")[2].strip('"')
    result_users = users.get_users_paginated(start_index, count, email)
    
    serialized_users = []
    for user in result_users:
        serialized_users.append(
            UserResponse(
                schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"],
                id = user["data"]["userId"],
                userName = user["email"],
                name = Name.model_validate(user["data"]["name"]),
                emails = [Email.model_validate(user["data"]["emails"])],
                displayName = user["name"],
                locale = user["data"]["locale"],
                externalId = user["internalId"],
                active = True, # ignore for now, since, can't insert actual timestamp
                groups = [], # ignore
            ).model_dump(mode='json')
        )
    return JSONResponse(
        status_code=200,
        content={
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "totalResults": len(serialized_users),
            "startIndex": start_index,
            "itemsPerPage": len(serialized_users),
            "Resources": serialized_users,
        },
    )

@public_app.get("/Users/{user_id}", dependencies=[Depends(auth_required)])
def get_user(user_id: str):
    """Get SCIM User"""
    tenant_id = 1
    user = users.get_by_uuid(user_id, tenant_id)
    if not user:
        return JSONResponse(
            status_code=404,
            content={
                "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
                "detail": "User not found",
                "status": 404,
            }
        )

    res = UserResponse(
        schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"],
        id = user["data"]["userId"],
        userName = user["email"],
        name = Name.model_validate(user["data"]["name"]),
        emails = [Email.model_validate(user["data"]["emails"])],
        displayName = user["name"],
        locale = user["data"]["locale"],
        externalId = user["internalId"],
        active = True, # ignore for now, since, can't insert actual timestamp
        groups = [], # ignore
    )
    return JSONResponse(status_code=201, content=res.model_dump(mode='json'))


@public_app.post("/Users", dependencies=[Depends(auth_required)])
async def create_user(r: UserRequest):
    """Create SCIM User"""
    tenant_id = 1
    existing_user = users.get_by_email_only(r.userName)
    deleted_user = users.get_deleted_user_by_email(r.userName)
    
    if existing_user:
        return JSONResponse(
            status_code = 409,
            content = {
                "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
                "detail": "User already exists in the database.",
                "status": 409,
            }
        )
    elif deleted_user:
        user_id = users.get_deleted_by_uuid(deleted_user["data"]["userId"], tenant_id)
        user = users.restore_scim_user(user_id=user_id["userId"], tenant_id=tenant_id, user_uuid=uuid.uuid4().hex, email=r.emails[0].value, admin=False,
                                   display_name=r.displayName, full_name=r.name.model_dump(mode='json'), emails=r.emails[0].model_dump(mode='json'),
                                   origin="okta", locale=r.locale, role_id=None, internal_id=r.externalId)
    else:
        try:
            user = users.create_scim_user(tenant_id=tenant_id, user_uuid=uuid.uuid4().hex, email=r.emails[0].value, admin=False,
                                   display_name=r.displayName, full_name=r.name.model_dump(mode='json'), emails=r.emails[0].model_dump(mode='json'),
                                   origin="okta", locale=r.locale, role_id=None, internal_id=r.externalId)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    res = UserResponse(
        schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"],
        id = user["data"]["userId"],
        userName = r.userName,
        name = r.name,
        emails = r.emails,
        displayName = r.displayName,
        locale = r.locale,
        externalId = r.externalId,
        active = r.active, # ignore for now, since, can't insert actual timestamp
        groups = [], # ignore
    )
    return JSONResponse(status_code=201, content=res.model_dump(mode='json'))

            

@public_app.put("/Users/{user_id}", dependencies=[Depends(auth_required)])
def update_user(user_id: str, r: UserRequest):
    """Update SCIM User"""
    tenant_id = 1
    user = users.get_by_uuid(user_id, tenant_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = r.model_dump(mode='json', exclude={"schemas", "emails", "name", "locale", "groups", "password", "active"}) # some of these should be added later if necessary
    nested_changes = r.model_dump(mode='json', include={"name", "emails"})
    mapping = {"userName": "email", "displayName": "name", "externalId": "internal_id"} # mapping between scim schema field names and local database model, can be done as config?
    for k, v in mapping.items():
        if k in changes:
            changes[v] = changes.pop(k)
    changes["data"] = {}
    for k, v in nested_changes.items():
        value_to_insert = v[0] if k == "emails" else v
        changes["data"][k] = value_to_insert
    try:
        users.update(tenant_id, user["userId"], changes)
        res = UserResponse(
            schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"],
            id = user["data"]["userId"],
            userName = r.userName,
            name = r.name,
            emails = r.emails,
            displayName = r.displayName,
            locale = r.locale,
            externalId = r.externalId,
            active = r.active, # ignore for now, since, can't insert actual timestamp
            groups = [], # ignore
        )
        
        return JSONResponse(status_code=201, content=res.model_dump(mode='json'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@public_app.patch("/Users/{user_id}", dependencies=[Depends(auth_required)])
def deactivate_user(user_id: str, r: PatchUserRequest):
    """Deactivate user, soft-delete"""
    tenant_id = 1
    active = r.model_dump(mode='json')["Operations"][0]["value"]["active"]
    if active:
        raise HTTPException(status_code=404, detail="Activating user is not supported")
    user = users.get_by_uuid(user_id, tenant_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users.delete_member_as_admin(tenant_id, user["userId"])

    return Response(status_code=204, content="")

@public_app.delete("/Users/{user_uuid}", dependencies=[Depends(auth_required)])
def delete_user(user_uuid: str):
    """Delete user from database, hard-delete"""
    tenant_id = 1
    user = users.get_by_uuid(user_uuid, tenant_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users.__hard_delete_user_uuid(user_uuid)
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
    tenant_id = 1
    group = roles.get_role_by_group_id(tenant_id, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    roles.delete_scim_group(tenant_id, group["data"]["groupId"])

    return Response(status_code=200, content="")
