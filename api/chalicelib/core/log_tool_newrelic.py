from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "newrelic"


async def get_all(tenant_id):
    return await log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


async def get(project_id):
    return await log_tools.get(project_id=project_id, integration=IN_TY)


async def update(tenant_id, project_id, changes):
    options = {}
    if "region" in changes:
        options["region"] = changes["region"]
    if "applicationId" in changes:
        options["applicationId"] = changes["applicationId"]
    if "xQueryKey" in changes:
        options["xQueryKey"] = changes["xQueryKey"]

    return await log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


async def add(tenant_id, project_id, application_id, x_query_key, region):
    # region=False => US; region=True => EU
    options = {"applicationId": application_id, "xQueryKey": x_query_key, "region": region}
    return await log_tools.add(project_id=project_id, integration=IN_TY, options=options)


async def delete(tenant_id, project_id):
    return await log_tools.delete(project_id=project_id, integration=IN_TY)


async def add_edit(tenant_id, project_id, data: schemas.IntegrationNewrelicSchema):
    s = await get(project_id)
    if s is not None:
        return await update(tenant_id=tenant_id, project_id=project_id,
                      changes={"applicationId": data.application_id,
                               "xQueryKey": data.x_query_key,
                               "region": data.region})
    else:
        return await add(tenant_id=tenant_id,
                   project_id=project_id,
                   application_id=data.application_id,
                   x_query_key=data.x_query_key,
                   region=data.region)
