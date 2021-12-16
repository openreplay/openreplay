from chalicelib.core import roles
from chalicelib.core import unlock
from chalicelib.utils import assist_helper

unlock.check()

from or_dependencies import OR_context
from routers.base import get_routers
import schemas
import schemas_ee
from fastapi import Depends, Body

public_app, app, app_apikey = get_routers()


@app.get('/client/roles', tags=["client", "roles"])
def get_roles(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': roles.get_roles(tenant_id=context.tenant_id)
    }


@app.post('/client/roles', tags=["client", "roles"])
@app.put('/client/roles', tags=["client", "roles"])
def add_role(data: schemas_ee.RolePayloadSchema = Body(...), context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.create(tenant_id=context.tenant_id, user_id=context.user_id, **data.dict())
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.post('/client/roles/{roleId}', tags=["client", "roles"])
@app.put('/client/roles/{roleId}', tags=["client", "roles"])
def edit_role(roleId: int, data: schemas_ee.RolePayloadSchema = Body(...),
              context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.update(tenant_id=context.tenant_id, user_id=context.user_id, role_id=roleId, changes=data.dict())
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.delete('/client/roles/{roleId}', tags=["client", "roles"])
def delete_role(roleId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.delete(tenant_id=context.tenant_id, user_id=context.user_id, role_id=roleId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/assist/credentials', tags=["assist"])
def get_assist_credentials():
    return {"data": assist_helper.get_full_config()}
