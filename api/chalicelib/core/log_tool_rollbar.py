from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "rollbar"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "accessToken" in changes:
        options["accessToken"] = changes["accessToken"]
    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, access_token):
    options = {"accessToken": access_token}
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegrationRollbarSchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"accessToken": data.access_token})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   access_token=data.access_token)
