from fastapi import HTTPException, status

from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestSearch, UTTestUpdate
from chalicelib.utils import helper, pg_client
from chalicelib.utils.TimeUTC import TimeUTC

table_name = "ut_tests"


def search_ui_tests(project_id: int, search: UTTestSearch):
    constraints, params = prepare_constraints_params_to_search(search, project_id)

    select_columns = ["id", "title", "description", "is_active", "created_by", "created_at", "updated_at"]
    sql = """
        SELECT COUNT(*) OVER() AS count, {columns}
        FROM {table}
        WHERE {constraints}
        ORDER BY %(sort_by)s %(sort_order)s
        LIMIT %(limit)s OFFSET %(offset)s;
    """.format(columns=", ".join(select_columns), table=table_name, constraints=" AND ".join(constraints))

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    if not rows or len(rows) == 0:
        return {"data": {"total": 0, "list": []}}

    total = rows[0]["count"]
    return {
        "data": {
            "list": [helper.dict_to_camel_case({key: value
                                                for key, value in row.items()}) for row in rows],
            "total": total,
            "page": search.page,
            "limit": search.limit
        }
    }


def create_ut_test(project_id: int, test_data: UTTestCreate):
    columns = test_data.model_dump().keys()
    values = test_data.model_dump().values()
    sql = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES ({', '.join(['%s'] * len(values))})
        RETURNING *;
    """

    with pg_client.PostgresClient() as cur:
        cur.execute(sql, list(values))
        row = cur.fetchone()

    return {
        "data": helper.dict_to_camel_case({key: TimeUTC.datetime_to_timestamp(value) if '_at' in key else value
                                           for key, value in row.items()})
    }


def get_ut_test(project_id: int, test_id: int):
    select_columns = ["test_id", "title", "description", "is_active", "created_by", "created_at", "updated_at"]

    tasks_sql = f"""
        SELECT * FROM public.ut_test_tasks AS utt
        WHERE utt.test_id = %(test_id)s;
    """

    sql = f"""
        SELECT {', '.join(select_columns)},
            ({tasks_sql}) AS tasks
        FROM {table_name}
        WHERE project_id = %(project_id)s AND test_id = %(test_id)s AND deleted_at IS NULL;
    """

    print(sql.replace("  ", ""))

    with pg_client.PostgresClient() as cur:
        cur.execute(sql, {'project_id': project_id, 'test_id': test_id})
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")

    row['created_at'] = TimeUTC.datetime_to_timestamp(row['created_at'])
    row['updated_at'] = TimeUTC.datetime_to_timestamp(row['updated_at'])
    row['tasks'] = [helper.dict_to_camel_case(task) for task in row['tasks']]

    return {
        "data": helper.dict_to_camel_case(row)
    }


def delete_ut_test(project_id: int, test_id: int):
    sql = f"""
        UPDATE {table_name}
        SET deleted_at = NOW()
        WHERE project_id = %(project_id)s AND test_id = %(test_id)s AND deleted_at IS NULL;
    """

    with pg_client.PostgresClient() as cur:
        cur.execute(sql, {'project_id': project_id, 'test_id': test_id})

    return {"status": "ok"}


def update_ut_test(project_id: int, test_id: int, test_update: UTTestUpdate):
    update_data = test_update.model_dump(exclude_unset=True)
    if not update_data:
        return {"status": "no_update"}

    set_clauses = [f"{key} = %({key})s" for key in update_data.keys()]
    update_data.update({"project_id": project_id, "test_id": test_id})
    sql = f"""
        UPDATE {table_name}
        SET {', '.join(set_clauses)}
        WHERE project_id = %(project_id)s AND test_id = %(test_id)s AND deleted_at IS NULL;
    """

    with pg_client.PostgresClient() as cur:
        cur.execute(sql, update_data)

    return {"status": "ok"}


def get_sessions(project_id: int, test_id: int):
    return {"status": "ok"}


def get_responses(project_id: int, test_id: int):
    sql = f"""
        SELECT * FROM public.ut_test_responses AS utr


def update_status(project_id: int, test_id: int, status: str):
    sql = f"""
        UPDATE {table_name}
        SET status = %(status)s
        WHERE project_id = %(project_id)s AND test_id = %(test_id)s AND deleted_at IS NULL;
    """

    with pg_client.PostgresClient() as cur:
        cur.execute(sql, {'project_id': project_id, 'test_id': test_id, 'status': status})

    return {"status": status}


def prepare_constraints_params_to_search(data, project_id):
    constraints = ["project_id = %(project_id)s", "deleted_at IS NULL"]
    params = {"project_id": project_id, "limit": data.limit, "offset": (data.page - 1) * data.limit}

    if data.is_active is not None:
        constraints.append("is_active = %(is_active)s")
        params["is_active"] = data.is_active

    if data.user_id is not None:
        constraints.append("created_by = %(user_id)s")
        params["user_id"] = data.user_id

    if data.query:
        constraints.append("title ILIKE %(query)s")
        params["query"] = f"%{data.query}%"

    return " AND ".join(constraints), params


def __prefix_table_name(source):
    return [f"{table_name}.{x}" for x in source]
