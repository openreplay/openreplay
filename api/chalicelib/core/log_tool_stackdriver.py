from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "stackdriver"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "serviceAccountCredentials" in changes:
        options["serviceAccountCredentials"] = changes["serviceAccountCredentials"]
    if "logName" in changes:
        options["logName"] = changes["logName"]
    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, service_account_credentials, log_name):
    options = {"serviceAccountCredentials": service_account_credentials, "logName": log_name}
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegartionStackdriverSchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"serviceAccountCredentials": data.service_account_credentials,
                               "logName": data.log_name})
    else:
        return add(tenant_id=tenant_id, project_id=project_id,
                   service_account_credentials=data.service_account_credentials,
                   log_name=data.log_name)
