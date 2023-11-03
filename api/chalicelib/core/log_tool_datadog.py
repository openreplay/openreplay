from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "datadog"


async def get_all(tenant_id):
    out = await log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)
    return out


async def get(project_id):
    out = await log_tools.get(project_id=project_id, integration=IN_TY)
    return out


async def update(tenant_id, project_id, changes):
    options = {}
    if "apiKey" in changes:
        options["apiKey"] = changes["apiKey"]
    if "applicationKey" in changes:
        options["applicationKey"] = changes["applicationKey"]

    out = await log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)
    return out


async def add(tenant_id, project_id, api_key, application_key):
    options = {"apiKey": api_key, "applicationKey": application_key}
    out = await log_tools.add(project_id=project_id, integration=IN_TY, options=options)
    return out


async def delete(tenant_id, project_id):
    out = await log_tools.delete(project_id=project_id, integration=IN_TY)
    return out


async def add_edit(tenant_id, project_id, data: schemas.IntegrationDatadogSchema):
    s = await get(project_id)
    if s is not None:
        out = await update(tenant_id=tenant_id, project_id=project_id,
                      changes={"apiKey": data.api_key,
                               "applicationKey": data.application_key})
        return out
    else:
        out = await add(tenant_id=tenant_id,
                   project_id=project_id,
                   api_key=data.api_key,
                   application_key=data.application_key)
        return out
