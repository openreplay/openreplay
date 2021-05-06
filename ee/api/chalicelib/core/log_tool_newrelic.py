from chalicelib.core import log_tools

IN_TY = "newrelic"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "region" in changes and len(changes["region"]) == 0:
        options["region"] = "US"
    if "applicationId" in changes:
        options["applicationId"] = changes["applicationId"]
    if "xQueryKey" in changes:
        options["xQueryKey"] = changes["xQueryKey"]

    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, application_id, x_query_key, region):
    if region is None or len(region) == 0:
        region = "US"
    options = {"applicationId": application_id, "xQueryKey": x_query_key, "region": region}
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"applicationId": data["applicationId"],
                               "xQueryKey": data["xQueryKey"],
                               "region": data["region"]})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   application_id=data["applicationId"],
                   x_query_key=data["xQueryKey"],
                   region=data["region"]
                   )
