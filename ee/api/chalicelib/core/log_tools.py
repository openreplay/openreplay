from chalicelib.utils import pg_client, helper
import json

EXCEPT = ["jira_server", "jira_cloud"]


def search(project_id):
    result = []
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                SELECT supported_integrations.name,
                       (SELECT COUNT(*)
                        FROM public.integrations
                                 INNER JOIN public.projects USING (project_id)
                        WHERE provider = supported_integrations.name
                          AND project_id = %(project_id)s
                          AND projects.deleted_at ISNULL
                        LIMIT 1) AS count
                FROM unnest(enum_range(NULL::integration_provider)) AS supported_integrations(name);""",
                {"project_id": project_id})
        )
        r = cur.fetchall()
        for k in r:
            if k["count"] > 0 and k["name"] not in EXCEPT:
                result.append({"value": helper.key_to_camel_case(k["name"]), "type": "logTool"})
        return {"data": result}


def add(project_id, integration, options):
    options = json.dumps(options)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                INSERT INTO public.integrations(project_id, provider, options) 
                VALUES (%(project_id)s, %(provider)s, %(options)s::jsonb)
                RETURNING *;""",
                {"project_id": project_id, "provider": integration, "options": options})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(helper.flatten_nested_dicts(r))


def get(project_id, integration):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                SELECT integrations.* 
                FROM public.integrations INNER JOIN public.projects USING(project_id)
                WHERE provider = %(provider)s 
                    AND project_id = %(project_id)s
                    AND projects.deleted_at ISNULL
                LIMIT 1;""",
                {"project_id": project_id, "provider": integration})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(helper.flatten_nested_dicts(r))


def get_all_by_type(integration):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                SELECT integrations.* 
                FROM public.integrations INNER JOIN public.projects USING(project_id)
                WHERE provider = %(provider)s AND projects.deleted_at ISNULL;""",
                {"provider": integration})
        )
        r = cur.fetchall()
    return helper.list_to_camel_case(r, flatten=True)


def edit(project_id, integration, changes):
    if "projectId" in changes:
        changes.pop("project_id")
    if "integration" in changes:
        changes.pop("integration")
    if len(changes.keys()) == 0:
        return None
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    UPDATE public.integrations
                    SET options=options||%(changes)s
                    WHERE project_id =%(project_id)s AND provider = %(provider)s 
                    RETURNING *;""",
                        {"project_id": project_id, "provider": integration, "changes": json.dumps(changes)})
        )
        return helper.dict_to_camel_case(helper.flatten_nested_dicts(cur.fetchone()))


def delete(project_id, integration):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    DELETE FROM public.integrations
                    WHERE project_id=%(project_id)s AND provider=%(provider)s;""",
                        {"project_id": project_id, "provider": integration})
        )
        return {"state": "success"}


def get_all_by_tenant(tenant_id, integration):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """\
                SELECT integrations.* 
                FROM public.integrations INNER JOIN public.projects USING(project_id) 
                WHERE provider = %(provider)s 
                    AND tenant_id = %(tenant_id)s
                    AND projects.deleted_at ISNULL;""",
                {"tenant_id": tenant_id, "provider": integration})
        )
        r = cur.fetchall()
    return helper.list_to_camel_case(r, flatten=True)