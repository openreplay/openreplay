from decouple import config
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils import pg_client
from chalicelib.core import integrations_manager, integration_base_issue
import json


def __get_saved_data(project_id, session_id, issue_id, tool):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT *
                    FROM public.assigned_sessions
                    WHERE  
                        session_id = %(session_id)s
                        AND issue_id = %(issue_id)s
                        AND provider = %(provider)s;\
    """,
                            {"session_id": session_id, "issue_id": issue_id, "provider": tool.lower()})
        cur.execute(
            query
        )
        return helper.dict_to_camel_case(cur.fetchone())


def create_new_assignment(tenant_id, project_id, session_id, creator_id, assignee, description, title, issue_type,
                          integration_project_id):
    error, integration = integrations_manager.get_integration(tenant_id=tenant_id, user_id=creator_id)
    if error is not None:
        return error

    i = integration.get()

    if i is None:
        return {"errors": [f"integration not found"]}
    link = config("SITE_URL") + f"/{project_id}/session/{session_id}"
    description += f"\n> {link}"
    try:
        issue = integration.issue_handler.create_new_assignment(title=title, assignee=assignee, description=description,
                                                                issue_type=issue_type,
                                                                integration_project_id=integration_project_id)
    except integration_base_issue.RequestException as e:
        return integration_base_issue.proxy_issues_handler(e)
    if issue is None or "id" not in issue:
        return {"errors": ["something went wrong while creating the issue"]}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                INSERT INTO public.assigned_sessions(session_id, issue_id, created_by, provider,provider_data) 
                VALUES (%(session_id)s, %(issue_id)s, %(creator_id)s, %(provider)s,%(provider_data)s);\
            """,
                            {"session_id": session_id, "creator_id": creator_id,
                             "issue_id": issue["id"], "provider": integration.provider.lower(),
                             "provider_data": json.dumps({"integrationProjectId": integration_project_id})})
        cur.execute(
            query
        )
    issue["provider"] = integration.provider.lower()
    return issue


def get_all(project_id, user_id):
    available_integrations = integrations_manager.get_available_integrations(user_id=user_id)
    no_integration = not any(available_integrations.values())
    if no_integration:
        return []
    all_integrations = all(available_integrations.values())
    extra_query = ["sessions.project_id = %(project_id)s"]
    if not all_integrations:
        extra_query.append("provider IN %(providers)s")
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                SELECT assigned_sessions.*
                FROM public.assigned_sessions
                    INNER JOIN public.sessions USING (session_id)
                WHERE {" AND ".join(extra_query)};\
""",
                            {"project_id": project_id,
                             "providers": tuple(d for d in available_integrations if available_integrations[d])})
        cur.execute(
            query
        )
        assignments = helper.list_to_camel_case(cur.fetchall())
        for a in assignments:
            a["createdAt"] = TimeUTC.datetime_to_timestamp(a["createdAt"])
        return assignments


def get_by_session(tenant_id, user_id, project_id, session_id):
    available_integrations = integrations_manager.get_available_integrations(user_id=user_id)
    if not any(available_integrations.values()):
        return []
    extra_query = ["session_id = %(session_id)s", "provider IN %(providers)s"]
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                SELECT *
                FROM public.assigned_sessions
                WHERE {" AND ".join(extra_query)};""",
                            {"session_id": session_id,
                             "providers": tuple([k for k in available_integrations if available_integrations[k]])})
        cur.execute(
            query
        )
        results = cur.fetchall()
    issues = {}
    for i in results:
        if i["provider"] not in issues.keys():
            issues[i["provider"]] = []

        issues[i["provider"]].append({"integrationProjectId": i["provider_data"]["integrationProjectId"],
                                      "id": i["issue_id"]})
    results = []
    for tool in issues.keys():
        error, integration = integrations_manager.get_integration(tool=tool, tenant_id=tenant_id, user_id=user_id)
        if error is not None:
            return error

        i = integration.get()
        if i is None:
            print("integration not found")
            continue

        r = integration.issue_handler.get_by_ids(saved_issues=issues[tool])
        for i in r["issues"]:
            i["provider"] = tool
        results += r["issues"]
    return results


def get(tenant_id, user_id, project_id, session_id, assignment_id):
    error, integration = integrations_manager.get_integration(tenant_id=tenant_id, user_id=user_id)
    if error is not None:
        return error
    l = __get_saved_data(project_id, session_id, assignment_id, tool=integration.provider)
    if l is None:
        return {"errors": ["issue not found"]}
    i = integration.get()
    if i is None:
        return {"errors": ["integration not found"]}
    r = integration.issue_handler.get(integration_project_id=l["providerData"]["integrationProjectId"],
                                      assignment_id=assignment_id)

    r["provider"] = integration.provider.lower()
    return r


def comment(tenant_id, user_id, project_id, session_id, assignment_id, message):
    error, integration = integrations_manager.get_integration(tenant_id=tenant_id, user_id=user_id)
    if error is not None:
        return error
    i = integration.get()

    if i is None:
        return {"errors": [f"integration not found"]}
    l = __get_saved_data(project_id, session_id, assignment_id, tool=integration.provider)

    return integration.issue_handler.comment(integration_project_id=l["providerData"]["integrationProjectId"],
                                             assignment_id=assignment_id,
                                             comment=message)
