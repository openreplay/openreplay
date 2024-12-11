from chalicelib.core import log_tools
import requests

from schemas import schemas

IN_TY = "bugsnag"


def list_projects(auth_token):
    r = requests.get(url="https://api.bugsnag.com/user/organizations",
                     params={"per_page": "100"},
                     headers={"Authorization": "token " + auth_token, "X-Version": "2"})
    if r.status_code != 200:
        print("=======> bugsnag get organizations: something went wrong")
        print(r)
        print(r.status_code)
        print(r.text)
        return []

    orgs = []
    for i in r.json():

        pr = requests.get(url="https://api.bugsnag.com/organizations/%s/projects" % i["id"],
                          params={"per_page": "100"},
                          headers={"Authorization": "token " + auth_token, "X-Version": "2"})
        if pr.status_code != 200:
            print("=======> bugsnag get projects: something went wrong")
            print(pr)
            print(r.status_code)
            print(r.text)
            continue
        orgs.append({"name": i["name"], "projects": [{"name": p["name"], "id": p["id"]} for p in pr.json()]})
    return orgs


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}
    if "authorizationToken" in changes:
        options["authorizationToken"] = changes.pop("authorizationToken")
    if "bugsnagProjectId" in changes:
        options["bugsnagProjectId"] = changes.pop("bugsnagProjectId")
    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, authorization_token, bugsnag_project_id):
    options = {
        "bugsnagProjectId": bugsnag_project_id,
        "authorizationToken": authorization_token,
    }
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data:schemas.IntegrationBugsnagSchema ):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"authorizationToken": data.authorization_token,
                               "bugsnagProjectId": data.bugsnag_project_id})
    else:
        return add(tenant_id=tenant_id,
                   project_id=project_id,
                   authorization_token=data.authorization_token,
                   bugsnag_project_id=data.bugsnag_project_id)
