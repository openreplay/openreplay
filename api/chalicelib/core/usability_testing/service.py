from fastapi import HTTPException, status

from chalicelib.core.db_request_handler import DatabaseRequestHandler
from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestSearch, UTTestUpdate, UTTestStatusUpdate
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import dict_to_camel_case, list_to_camel_case

table_name = "ut_tests"


def search_ui_tests(project_id: int, search: UTTestSearch):
    select_columns = [
        "ut.test_id",
        "ut.title",
        "ut.description",
        "ut.created_at",
        "ut.updated_at",
        "json_build_object('user_id', u.user_id, 'name', u.name) AS created_by"
    ]

    db_handler = DatabaseRequestHandler("ut_tests AS ut")
    db_handler.set_select_columns([f"COUNT(*) OVER() AS count"] + select_columns)
    db_handler.add_join("LEFT JOIN users u ON ut.created_by = u.user_id")
    db_handler.add_constraint("ut.project_id = %(project_id)s", {'project_id': project_id})
    db_handler.set_sort_by(f"ut.{search.sort_by} {search.sort_order}")
    db_handler.set_pagination(page=search.page, page_size=search.limit)

    if (search.user_id is not None) and (search.user_id != 0):
        db_handler.add_constraint("ut.created_by = %(user_id)s", {'user_id': search.user_id})

    if search.query:
        db_handler.add_constraint("ut.title ILIKE %(query)s", {'query': f"%{search.query}%"})

    rows = db_handler.fetchall()

    if not rows or len(rows) == 0:
        return {"data": {"total": 0, "list": []}}

    total = rows[0]["count"]
    return {
        "data": {
            "list": list_to_camel_case(rows),
            "total": total,
            "page": search.page,
            "limit": search.limit
        }
    }


def create_ut_test(test_data: UTTestCreate):
    db_handler = DatabaseRequestHandler("ut_tests")
    data = {
        'project_id': test_data.project_id,
        'title': test_data.title,
        'description': test_data.description,
        'created_by': test_data.created_by,
        'status': test_data.status,
    }

    # Execute the insert query
    new_test = db_handler.insert(data)
    test_id = new_test['test_id']

    # Insert tasks
    if test_data.tasks:
        new_test['tasks'] = insert_tasks(test_id, test_data.tasks)
    else:
        new_test['tasks'] = []

    return {
        "data": dict_to_camel_case(new_test)
    }


def insert_tasks(test_id, tasks):
    db_handler = DatabaseRequestHandler("ut_tests_tasks")
    data = []
    for task in tasks:
        data.append({
            'test_id': test_id,
            'title': task.title,
            'description': task.description,
            'allow_typing': task.allow_typing,
        })

    return db_handler.batch_insert(data)


def get_ut_test(project_id: int, test_id: int):
    db_handler = DatabaseRequestHandler("ut_tests AS ut")

    tasks_sql = """
        SELECT COALESCE(jsonb_agg(utt ORDER BY task_id), '[]'::jsonb) AS tasks
        FROM public.ut_tests_tasks AS utt
        WHERE utt.test_id = %(test_id)s
    """

    select_columns = [
        "ut.test_id",
        "ut.title",
        "ut.description",
        "ut.status",
        "ut.created_at",
        "ut.updated_at",
        "json_build_object('id', u.user_id, 'name', u.name) AS created_by"
    ]
    db_handler.set_select_columns(select_columns + [f"({tasks_sql}) AS tasks"])
    db_handler.add_join("LEFT JOIN users u ON ut.created_by = u.user_id")
    db_handler.add_constraint("ut.project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("ut.test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("ut.deleted_at IS NULL")

    row = db_handler.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")

    row['created_at'] = TimeUTC.datetime_to_timestamp(row['created_at'])
    row['updated_at'] = TimeUTC.datetime_to_timestamp(row['updated_at'])
    row['tasks'] = [dict_to_camel_case(task) for task in row['tasks']]

    return {
        "data": dict_to_camel_case(row)
    }


def delete_ut_test(project_id: int, test_id: int):
    db_handler = DatabaseRequestHandler("ut_tests")
    update_data = {'deleted_at': 'NOW()'}  # Using a SQL function directly
    db_handler.add_constraint("project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("deleted_at IS NULL")

    try:
        db_handler.update(update_data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


def check_test_exists(db_handler, project_id, test_id):
    db_handler.set_select_columns(['1'])  # '1' as a dummy column for existence check
    db_handler.add_constraint("project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("deleted_at IS NULL")

    return bool(db_handler.fetchone())


def update_ut_test(project_id: int, test_id: int, test_update: UTTestUpdate):
    db_handler = DatabaseRequestHandler("ut_tests")

    # Check if the test exists
    if not check_test_exists(db_handler, project_id, test_id):
        return {"status": "error", "message": "Test not found"}

    tasks = test_update.tasks
    del test_update.tasks

    update_data = test_update.model_dump(exclude_unset=True)
    if not update_data:
        return {"status": "no_update"}

    db_handler.constraints.clear()
    db_handler.add_constraint("project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("deleted_at IS NULL")

    result = db_handler.update(update_data)

    if result is None:
        return {"status": "error", "message": "No update was made"}

    result['tasks'] = check_tasks_update(db_handler, test_id, tasks)

    return {
        "data": dict_to_camel_case(result)
    }


def check_tasks_update(db_handler, test_id, tasks):
    if tasks is None:
        return []

    db_handler = DatabaseRequestHandler("ut_tests_tasks")
    existing_tasks = get_test_tasks(db_handler, test_id)
    existing_task_ids = {task['task_id'] for task in existing_tasks}

    to_be_updated = [task for task in tasks if task.task_id in existing_task_ids]
    to_be_created = [task for task in tasks if task.task_id not in existing_task_ids]
    to_be_deleted = existing_task_ids - {task.task_id for task in tasks}

    # Perform batch operations
    if to_be_updated:
        batch_update_tasks(db_handler, to_be_updated)

    if to_be_created:
        insert_tasks(test_id, to_be_created)

    if to_be_deleted:
        delete_tasks(db_handler, to_be_deleted)

    return get_test_tasks(db_handler, test_id)


def delete_tasks(db_handler, task_ids):
    db_handler.constraints.clear()
    db_handler.add_constraint("task_id IN %(task_ids)s", {'task_ids': tuple(task_ids)})
    db_handler.delete()


def batch_update_tasks(db_handler, tasks):
    db_handler = DatabaseRequestHandler("ut_tests_tasks")
    data = []
    for task in tasks:
        data.append({
            'task_id': task.task_id,
            'title': task.title,
            'description': task.description,
            'allow_typing': task.allow_typing,
        })

    db_handler.batch_update(data)


def get_test_tasks(db_handler, test_id):
    db_handler.constraints.clear()
    db_handler.set_select_columns(['task_id', 'title', 'description', 'allow_typing'])
    db_handler.add_constraint("test_id = %(test_id)s", {'test_id': test_id})

    return db_handler.fetchall()


def ut_tests_sessions(project_id: int, test_id: int, page: int, limit: int):
    db_handler = DatabaseRequestHandler("ut_tests_signals AS uts")
    db_handler.set_select_columns(["s.*"])
    db_handler.add_join("JOIN sessions s ON uts.session_id = s.session_id AND s.project_id = %(project_id)s")
    db_handler.add_constraint("uts.type = %(type)s", {'type': 'test'})
    db_handler.add_constraint("uts.status IN %(status_list)s", {'status_list': ('finished', 'aborted')})
    db_handler.add_constraint("project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("uts.type_id = %(test_id)s", {'test_id': test_id})
    db_handler.set_pagination(page, limit)

    sessions = db_handler.fetchall()

    return {
        "data": {
            "list": list_to_camel_case(sessions),
            "page": page,
            "limit": limit
        }
    }


def get_responses(project_id: int, test_id: int, task_id: int, page: int = 1, limit: int = 10, query: str = None):
    db_handler = DatabaseRequestHandler("ut_tests_signals AS uts")
    db_handler.set_select_columns(["uts.*"])
    db_handler.add_constraint("uts.comment IS NOT NULL")
    db_handler.add_constraint("uts.type = %(type)s", {'type': 'task'})
    db_handler.add_constraint("uts.status IN %(status_list)s", {'status_list': ('done', 'skipped')})
    # db_handler.add_constraint("project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("uts.type_id = %(test_id)s", {'test_id': task_id})
    db_handler.set_pagination(page, limit)

    responses = db_handler.fetchall()

    return {
        "data": {
            "list": responses,
            "page": page,
            "limit": limit
        }
    }
