import requests
from chalicelib.core import log_tools
from schemas import schemas

IN_TY = "sentry"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "organizationSlug" in changes:
        options["organizationSlug"] = changes["organizationSlug"]
    if "projectSlug" in changes:
        options["projectSlug"] = changes["projectSlug"]
    if "token" in changes:
        options["token"] = changes["token"]

    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=changes)


def add(tenant_id, project_id, project_slug, organization_slug, token):
    options = {
        "organizationSlug": organization_slug, "projectSlug": project_slug, "token": token
    }
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegrationSentrySchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"projectSlug": data.project_slug,
                               "organizationSlug": data.organization_slug,
                               "token": data.token})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   project_slug=data.project_slug,
                   organization_slug=data.organization_slug,
                   token=data.token)


def proxy_get(tenant_id, project_id, event_id):
    i = get(project_id)
    if i is None:
        return {}
    r = requests.get(
        url="https://sentry.io/api/0/projects/%(organization_slug)s/%(project_slug)s/events/%(event_id)s/" % {
            "organization_slug": i["organizationSlug"], "project_slug": i["projectSlug"], "event_id": event_id},
        headers={"Authorization": "Bearer " + i["token"]})
    if r.status_code != 200:
        print("=======> sentry get: something went wrong")
        print(r)
        print(r.status_code)
        print(r.text)
    return r.json()
