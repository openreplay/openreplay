from chalicelib.utils import pg_client, helper
import json

EXCEPT = ["jira_server", "jira_cloud"]


async def search(project_id):
    result = []
    async with pg_client.cursor() as cur:
        await cur.execute(
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
        r = await cur.fetchall()
        for k in r:
            if k["count"] > 0 and k["name"] not in EXCEPT:
                result.append({"value": helper.key_to_camel_case(k["name"]), "type": "logTool"})
        return {"data": result}


async def add(project_id, integration, options):
    options = json.dumps(options)
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(
                """\
                INSERT INTO public.integrations(project_id, provider, options) 
                VALUES (%(project_id)s, %(provider)s, %(options)s::jsonb)
                RETURNING *;""",
                {"project_id": project_id, "provider": integration, "options": options})
        )
        r = await cur.fetchone()
    return helper.dict_to_camel_case(helper.flatten_nested_dicts(r))


async def get(project_id, integration):
    async with pg_client.cursor() as cur:
        await cur.execute(
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
        r = await cur.fetchone()
    return helper.dict_to_camel_case(helper.flatten_nested_dicts(r))


async def get_all_by_type(integration):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(
                """\
                SELECT integrations.* 
                FROM public.integrations INNER JOIN public.projects USING(project_id)
                WHERE provider = %(provider)s AND projects.deleted_at ISNULL;""",
                {"provider": integration})
        )
        r = await cur.fetchall()
    return helper.list_to_camel_case(r, flatten=True)


async def edit(project_id, integration, changes):
    if "projectId" in changes:
        changes.pop("project_id")
    if "integration" in changes:
        changes.pop("integration")
    if len(changes.keys()) == 0:
        return None
    with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify("""\
                    UPDATE public.integrations
                    SET options=options||%(changes)s
                    WHERE project_id =%(project_id)s AND provider = %(provider)s 
                    RETURNING *;""",
                        {"project_id": project_id, "provider": integration, "changes": json.dumps(changes)})
        )
        return helper.dict_to_camel_case(helper.flatten_nested_dicts(await cur.fetchone()))


async def delete(project_id, integration):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify("""\
                    DELETE FROM public.integrations
                    WHERE project_id=%(project_id)s AND provider=%(provider)s;""",
                        {"project_id": project_id, "provider": integration})
        )
        return {"state": "success"}


async def get_all_by_tenant(tenant_id, integration):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(
                """SELECT integrations.* 
                    FROM public.integrations INNER JOIN public.projects USING(project_id) 
                    WHERE provider = %(provider)s 
                        AND projects.deleted_at ISNULL;""",
                {"provider": integration})
        )
        r = await cur.fetchall()
    return helper.list_to_camel_case(r, flatten=True)
