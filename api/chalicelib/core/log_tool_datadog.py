from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "datadog"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "apiKey" in changes:
        options["apiKey"] = changes["apiKey"]
    if "applicationKey" in changes:
        options["applicationKey"] = changes["applicationKey"]

    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, api_key, application_key):
    options = {"apiKey": api_key, "applicationKey": application_key}
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegrationDatadogSchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"apiKey": data.api_key,
                               "applicationKey": data.application_key})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   api_key=data.api_key,
                   application_key=data.application_key)
