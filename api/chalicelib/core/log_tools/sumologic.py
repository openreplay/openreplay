from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "sumologic"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}

    if "region" in changes:
        options["region"] = changes["region"]

    if "accessId" in changes:
        options["accessId"] = changes["accessId"]

    if "accessKey" in changes:
        options["accessKey"] = changes["accessKey"]
    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, access_id, access_key, region):
    options = {
        "accessId": access_id,
        "accessKey": access_key,
        "region": region
    }
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegrationSumologicSchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"accessId": data.access_id,
                               "accessKey": data.access_key,
                               "region": data.region})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   access_id=data.access_id,
                   access_key=data.access_key,
                   region=data.region)
