from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "stackdriver"


async def get_all(tenant_id):
    return await log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


async def get(project_id):
    return await log_tools.get(project_id=project_id, integration=IN_TY)


async def update(tenant_id, project_id, changes):
    options = {}
    if "serviceAccountCredentials" in changes:
        options["serviceAccountCredentials"] = changes["serviceAccountCredentials"]
    if "logName" in changes:
        options["logName"] = changes["logName"]
    return await log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


async def add(tenant_id, project_id, service_account_credentials, log_name):
    options = {"serviceAccountCredentials": service_account_credentials, "logName": log_name}
    return await log_tools.add(project_id=project_id, integration=IN_TY, options=options)


async def delete(tenant_id, project_id):
    return await log_tools.delete(project_id=project_id, integration=IN_TY)


async def add_edit(tenant_id, project_id, data: schemas.IntegartionStackdriverSchema):
    s = await get(project_id)
    if s is not None:
        return await update(tenant_id=tenant_id, project_id=project_id,
                      changes={"serviceAccountCredentials": data.service_account_credentials,
                               "logName": data.log_name})
    else:
        return await add(tenant_id=tenant_id, project_id=project_id,
                   service_account_credentials=data.service_account_credentials,
                   log_name=data.log_name)
