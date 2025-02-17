import logging
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

"""
Models:

USER

schemas         -> hardcoded
id              -> from db
userName        -> email, comes from Okta
name:
    givenName   -> from Okta
    middleName  -> from Okta
    familyName  -> from Okta
emails:
    primary     -> from Okta
    value       -> from Okta
    type        -> from Okta
displayName     -> from Okta (potentially, givenName+" "+familyName)
locale          -> from Okta (e.g. en-US)
externalId      -> from Okta
active          -> ! doesn't exist, but represent deleted users
groups          -> users: {"display": group.displayName, "value": group.id}
meta            -> hardcoded

    
GROUP

schemas         -> hardcoded
id              -> from db
meta            -> hardcoded
displayName     -> from db
members         -> users: {"display": user.userName, "value": user.id}


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
    emails: list[Email] # ignore for now
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


# Authentication Dependency
def auth_required(authorization: str = Header(..., alias="Authorization")):
    """Dependency to check Authorization header."""
    token = authorization.replace("Bearer ", "")
    if token != config("OCTA_TOKEN"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    return token


public_app, app, app_apikey = get_routers(prefix="/sso/scim/v2")

@public_app.get("/Users", dependencies=[Depends(auth_required)])
async def get_users(
    start_index: int = Query(1, alias="startIndex"),
    count: Optional[int] = Query(1, alias="count"),
    filter: Optional[str] = Query(None, alias="filter"),
):
    """Get SCIM Users"""
    if filter:
        single_filter = filter.split(" ")
        filter_value = single_filter[2].strip('"')

        filtered_users = users.get_by_email_with_uuid(filter_value)
        filtered_users = [filtered_users] if filtered_users else []
    else:
        filtered_users = users.get_users_paginated(start_index, count)
    
    serialized_users = []
    for user in filtered_users:
        logger.info(user)
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
    user = users.get_by_uuid(user_id, 1)
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
    ## This needs to manage addition of previously deactivated users
    """Create SCIM User"""
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
        user_id = users.get_deleted_by_uuid(deleted_user["data"]["userId"], 1)
        user = users.restore_scim_user(user_id=user_id["userId"], tenant_id=1, user_uuid=uuid.uuid4().hex, email=r.emails[0].value, admin=False,
                                   display_name=r.displayName, full_name=r.name.model_dump(mode='json'), emails=r.emails[0].model_dump(mode='json'),
                                   origin="okta", locale=r.locale, role_id=None, internal_id=r.externalId)
    else:
        try:
            # Need to handle groups later, for now ignore them
            user = users.create_scim_user(tenant_id=1, user_uuid=uuid.uuid4().hex, email=r.emails[0].value, admin=False,
                                   display_name=r.displayName, full_name=r.name.model_dump(mode='json'), emails=r.emails[0].model_dump(mode='json'),
                                   origin="okta", locale=r.locale, role_id=None, internal_id=r.externalId) # role_id is set to 2 by default...
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    res = UserResponse(
        schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"],
        id = user["data"]["userId"], # Transformed to camel case
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

            

@public_app.put("/Users/{user_id}", dependencies=[Depends(auth_required)]) # insert your header later
def update_user(user_id: str, r: UserRequest):
    """Update SCIM User"""
    logger.info(r)
    user = users.get_by_uuid(user_id, 1)
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
        # Need to handle groups later, for now ignore them
        users.update(1, user["userId"], changes)
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
    logger.info(r)
    active = r.model_dump(mode='json')["Operations"][0]["value"]["active"]
    logger.info(active)
    if active:
        raise HTTPException(status_code=404, detail="Activating user is not supported")
    user = users.get_by_uuid(user_id, 1)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(user)
    users.delete_member_as_admin(1, user["userId"])

    return Response(status_code=204, content="")

@public_app.delete("/Users/{user_uuid}", dependencies=[Depends(auth_required)])
def delete_user(user_uuid: str):
    user = users.get_by_uuid(user_uuid, 1)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users.__hard_delete_user_uuid(user_uuid)
    return Response(status_code=204, content="")


"""
Group endpoints

Potential issues:
1. Every user can be assigned only to single role
2. Deleting the group might be constrained by existing users linked to the role, 
   since those can't be left orphans
3. 

"""

class Operation(BaseModel):
    op: str
    path: str = Field(default=None)
    value: list[dict] | dict = Field(default=None)

class GroupRequest(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:schemas:core:2.0:Group"])
    displayName: str = Field(default=None)
    members: list = Field(default=None)
    operations: list[Operation] = Field(default=None, alias="Operations")

class GroupPatchRequest(BaseModel):
    schemas: list[str] = Field(default=["urn:ietf:params:scim:api:messages:2.0:PatchOp"])
    operations: list[Operation] = Field(alias="Operations")

class GroupResponse(BaseModel):
    schemas: list[str]
    id: str
    meta: dict = Field(default={"resourceType": "Group"})
    displayName: str
    members: list

@public_app.get("/Groups", dependencies=[Depends(auth_required)])
def get_groups(): # Might need to add query params later
    groups = roles.get_roles_with_uuid(1)
    res = []
    for group in groups:
        res.append(GroupResponse(
            schemas=["urn:ietf:params:scim:schemas:core:2.0:Group"],
            id=group["data"]["groupId"],
            displayName=group["name"],
            members=[], # add later
    ).model_dump(mode='json'))
    return JSONResponse(
        status_code=200,
        content=res
    )

@public_app.get("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def get_group(group_id: str):
    group = roles.get_role_by_group_id(1, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            schemas=["urn:ietf:params:scim:schemas:core:2.0:Group"],
            id=group["data"]["groupId"],
            displayName=group["name"],
            members=[], # add later
    ).model_dump(mode='json'))

@public_app.post("/Groups", dependencies=[Depends(auth_required)])
def create_group(r: GroupRequest):
    logger.info(r)
    try:
        data = schemas.RolePayloadSchema(name=r.displayName, permissions=[schemas.Permissions.SESSION_REPLAY]) # one permission for now
        group = roles.create_as_admin(1, uuid.uuid4().hex, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            schemas=["urn:ietf:params:scim:schemas:core:2.0:Group"],
            id=group["data"]["groupId"],
            displayName=group["name"],
            members=[], # add later
    ).model_dump(mode='json'))


@public_app.put("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def update_put_group(group_id: str, r: GroupRequest):
    # Possibly need to change GroupRequest object to accept a different structure
    logger.info(r)
    group = roles.get_role_by_group_id(1, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if r.operations and r.operations[0].op == "replace" and r.operations[0].path is None:
        roles.update_group_name(1, group["data"]["groupId"], r.operations[0].value["displayName"])
        return Response(status_code=200, content="")

    members = r.members
    modified_members = []
    for member in members:
        user = users.get_by_uuid(member["value"], 1)
        if user:
            users.update(1, user["userId"], {"role_id": group["roleId"]})
            modified_members.append({
                "value": user["data"]["userId"],
                "display": user["name"]
            })
    
    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            schemas=["urn:ietf:params:scim:schemas:core:2.0:Group"],
            id=group_id,
            displayName=group["name"],
            members=modified_members,
    ).model_dump(mode='json'))

    
@public_app.patch("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def update_patch_group(group_id: str, r: GroupPatchRequest):
    logger.info(r)
    group = roles.get_role_by_group_id(1, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if r.operations[0].op == "replace" and r.operations[0].path is None:
        roles.update_group_name(1, group["data"]["groupId"], r.operations[0].value["displayName"])
        return Response(status_code=200, content="")
    
    if r.operations[0].op == "replace":
        # find all members of that role, and for those that don't intersect with the list, set them to default role and return
        pass
    modified_members = []
    for op in r.operations:
        if op.op == "add":
            for u in op.value:
                user = users.get_by_uuid(u["value"], 1)
                if user:
                    users.update(1, user["userId"], {"role_id": group["roleId"]})
                    modified_members.append({
                        "value": user["data"]["userId"],
                        "display": user["name"]
                    })
        else:
            # possibly remove by parsing the path?    
            pass    
    return JSONResponse(
        status_code=200,
        content=GroupResponse(
            schemas=["urn:ietf:params:scim:schemas:core:2.0:Group"],
            id=group_id,
            displayName=group["name"],
            members=modified_members,
    ).model_dump(mode='json'))


@public_app.delete("/Groups/{group_id}", dependencies=[Depends(auth_required)])
def delete_group(group_id: str):
    group = roles.get_role_by_group_id(1, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    roles.delete_scim_group(1, group["data"]["groupId"])

    return Response(status_code=200, content="")
