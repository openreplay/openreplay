import re
from typing import Optional

from fastapi import HTTPException, status

from chalicelib.core import projects
from chalicelib.utils import pg_client

MAX_INDEXES = 10


def column_names():
    return [f"metadata_{i}" for i in range(1, MAX_INDEXES + 1)]


def __exists_by_name(project_id: int, name: str, exclude_index: Optional[int]) -> bool:
    with pg_client.PostgresClient() as cur:
        constraints = column_names()
        if exclude_index:
            del constraints[exclude_index - 1]
        for i in range(len(constraints)):
            constraints[i] += " ILIKE %(name)s"
        query = cur.mogrify(f"""SELECT EXISTS(SELECT 1
                                FROM public.projects
                                WHERE project_id = %(project_id)s 
                                  AND deleted_at ISNULL
                                  AND ({" OR ".join(constraints)})) AS exists;""",
                            {"project_id": project_id, "name": name})
        cur.execute(query=query)
        row = cur.fetchone()

    return row["exists"]


def get(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT {",".join(column_names())}
                                FROM public.projects
                                WHERE project_id = %(project_id)s 
                                    AND deleted_at ISNULL
                                LIMIT 1;""", {"project_id": project_id})
        cur.execute(query=query)
        metas = cur.fetchone()
        results = []
        if metas is not None:
            for i, k in enumerate(metas.keys()):
                if metas[k] is not None:
                    results.append({"key": metas[k], "index": i + 1})
        return results


def get_batch(project_ids):
    if project_ids is None or len(project_ids) == 0:
        return []
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT project_id, {",".join(column_names())}
                                FROM public.projects
                                WHERE project_id IN %(project_ids)s 
                                    AND deleted_at ISNULL;""",
                            {"project_ids": tuple(project_ids)})
        cur.execute(query=query)
        full_metas = cur.fetchall()
    results = {}
    if full_metas is not None and len(full_metas) > 0:
        for metas in full_metas:
            results[str(metas["project_id"])] = []
            for i, k in enumerate(metas.keys()):
                if metas[k] is not None and k != "project_id":
                    results[str(metas["project_id"])].append({"key": metas[k], "index": i + 1})
    return results


regex = re.compile(r'^[a-z0-9_-]+$', re.IGNORECASE)


def index_to_colname(index):
    if index <= 0 or index > MAX_INDEXES:
        raise Exception("metadata index out or bound")
    return f"metadata_{index}"


def __get_available_index(project_id):
    used_indexs = get(project_id)
    used_indexs = [i["index"] for i in used_indexs]
    if len(used_indexs) >= MAX_INDEXES:
        return -1
    i = 1
    while i in used_indexs:
        i += 1
    return i


def __edit(project_id, col_index, colname, new_name):
    if new_name is None or len(new_name) == 0:
        return {"errors": ["key value invalid"]}
    old_metas = get(project_id)
    old_metas = {k["index"]: k for k in old_metas}
    if col_index not in list(old_metas.keys()):
        return {"errors": ["custom field not found"]}

    with pg_client.PostgresClient() as cur:
        if old_metas[col_index]["key"] != new_name:
            query = cur.mogrify(f"""UPDATE public.projects 
                                    SET {colname} = %(value)s 
                                    WHERE project_id = %(project_id)s 
                                        AND deleted_at ISNULL
                                    RETURNING {colname};""",
                                {"project_id": project_id, "value": new_name})
            cur.execute(query=query)
            new_name = cur.fetchone()[colname]
            old_metas[col_index]["key"] = new_name
    return {"data": old_metas[col_index]}


def edit(tenant_id, project_id, index: int, new_name: str):
    if __exists_by_name(project_id=project_id, name=new_name, exclude_index=index):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
    return __edit(project_id=project_id, col_index=index, colname=index_to_colname(index), new_name=new_name)


def delete(tenant_id, project_id, index: int):
    index = int(index)
    old_segments = get(project_id)
    old_segments = [k["index"] for k in old_segments]
    if index not in old_segments:
        return {"errors": ["custom field not found"]}

    with pg_client.PostgresClient() as cur:
        colname = index_to_colname(index)
        query = cur.mogrify(f"""UPDATE public.projects 
                                SET {colname}= NULL
                                WHERE project_id = %(project_id)s AND deleted_at ISNULL;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        query = cur.mogrify(f"""UPDATE public.sessions 
                                SET {colname}= NULL
                                WHERE project_id = %(project_id)s
                                    AND {colname} IS NOT NULL
                                """,
                            {"project_id": project_id})
        cur.execute(query=query)

    return {"data": get(project_id)}


def add(tenant_id, project_id, new_name):
    index = __get_available_index(project_id=project_id)
    if index < 1:
        return {"errors": ["maximum allowed metadata reached"]}
    if __exists_by_name(project_id=project_id, name=new_name, exclude_index=None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
    with pg_client.PostgresClient() as cur:
        colname = index_to_colname(index)
        query = cur.mogrify(f"""UPDATE public.projects 
                                SET {colname}= %(key)s 
                                WHERE project_id =%(project_id)s 
                                RETURNING {colname};""",
                            {"key": new_name, "project_id": project_id})
        cur.execute(query=query)
        col_val = cur.fetchone()[colname]
    return {"data": {"key": col_val, "index": index}}


def search(tenant_id, project_id, key, value):
    value = value + "%"
    s_query = []
    for f in column_names():
        s_query.append(f"CASE WHEN {f}=%(key)s THEN TRUE ELSE FALSE END AS {f}")

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT {",".join(s_query)}
                                FROM public.projects
                                WHERE project_id = %(project_id)s 
                                    AND deleted_at ISNULL
                                LIMIT 1;""",
                            {"key": key, "project_id": project_id})
        cur.execute(query=query)
        all_metas = cur.fetchone()
        key = None
        for c in all_metas:
            if all_metas[c]:
                key = c
                break
        if key is None:
            return {"errors": ["key does not exist"]}
        query = cur.mogrify(f"""SELECT DISTINCT "{key}" AS "{key}"
                                FROM public.sessions
                                {f'WHERE "{key}"::text ILIKE %(value)s' if value is not None and len(value) > 0 else ""}
                                ORDER BY "{key}"
                                LIMIT 20;""",
                            {"value": value, "project_id": project_id})
        cur.execute(query=query)
        value = cur.fetchall()
        return {"data": [k[key] for k in value]}


def get_available_keys(project_id):
    all_metas = get(project_id=project_id)
    return [k["key"] for k in all_metas]


def get_by_session_id(project_id, session_id):
    all_metas = get(project_id=project_id)
    if len(all_metas) == 0:
        return []
    keys = {index_to_colname(k["index"]): k["key"] for k in all_metas}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT {",".join(keys.keys())}
                                FROM public.sessions
                                WHERE project_id= %(project_id)s 
                                    AND session_id=%(session_id)s;""",
                            {"session_id": session_id, "project_id": project_id})
        cur.execute(query=query)
        session_metas = cur.fetchall()
        results = []
        for m in session_metas:
            r = {}
            for k in m.keys():
                r[keys[k]] = m[k]
            results.append(r)
        return results


def get_keys_by_projects(project_ids):
    if project_ids is None or len(project_ids) == 0:
        return {}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT project_id,{",".join(column_names())}
                                FROM public.projects
                                WHERE project_id IN %(project_ids)s 
                                    AND deleted_at ISNULL;""",
                            {"project_ids": tuple(project_ids)})

        cur.execute(query)
        rows = cur.fetchall()
        results = {}
        for r in rows:
            project_id = r.pop("project_id")
            results[project_id] = {}
            for m in r:
                if r[m] is not None:
                    results[project_id][m] = r[m]
        return results


# def add_edit_delete(tenant_id, project_id, new_metas):
#     old_metas = get(project_id)
#     old_indexes = [k["index"] for k in old_metas]
#     new_indexes = [k["index"] for k in new_metas if "index" in k]
#     new_keys = [k["key"] for k in new_metas]
#
#     add_metas = [k["key"] for k in new_metas
#                  if "index" not in k]
#     new_metas = {k["index"]: {"key": k["key"]} for
#                  k in new_metas if
#                  "index" in k}
#     old_metas = {k["index"]: {"key": k["key"]} for k in old_metas}
#
#     if len(new_keys) > 20:
#         return {"errors": ["you cannot add more than 20 key"]}
#     for k in new_metas.keys():
#         if re.match(regex, new_metas[k]["key"]) is None:
#             return {"errors": [f"invalid key {k}"]}
#     for k in add_metas:
#         if re.match(regex, k) is None:
#             return {"errors": [f"invalid key {k}"]}
#     if len(new_indexes) > len(set(new_indexes)):
#         return {"errors": ["duplicate indexes"]}
#     if len(new_keys) > len(set(new_keys)):
#         return {"errors": ["duplicate keys"]}
#     to_delete = list(set(old_indexes) - set(new_indexes))
#
#     with pg_client.PostgresClient() as cur:
#         for d in to_delete:
#             delete(tenant_id=tenant_id, project_id=project_id, index=d)
#
#         for k in add_metas:
#             add(tenant_id=tenant_id, project_id=project_id, new_name=k)
#
#         for k in new_metas.keys():
#             if new_metas[k]["key"].lower() != old_metas[k]["key"]:
#                 edit(tenant_id=tenant_id, project_id=project_id, index=k, new_name=new_metas[k]["key"])
#
#     return {"data": get(project_id)}


def get_remaining_metadata_with_count(tenant_id):
    all_projects = projects.get_projects(tenant_id=tenant_id)
    results = []
    used_metas = get_batch([p["projectId"] for p in all_projects])
    for p in all_projects:
        if MAX_INDEXES < 0:
            remaining = -1
        else:
            remaining = MAX_INDEXES - len(used_metas[str(p["projectId"])])
        results.append(
            {**p, "limit": MAX_INDEXES, "remaining": remaining, "count": len(used_metas[str(p["projectId"])])})

    return results
