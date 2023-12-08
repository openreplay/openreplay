import logging

from fastapi import HTTPException, status

from chalicelib.core.db_request_handler import DatabaseRequestHandler
from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestSearch, UTTestUpdate
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import dict_to_camel_case, list_to_camel_case

from chalicelib.core import sessions, assist

table_name = "ut_tests"


def search_ui_tests(project_id: int, search: UTTestSearch):
    select_columns = [
        "ut.test_id",
        "ut.title",
        "ut.description",
        "ut.created_at",
        "ut.updated_at",
        "ut.status",
        "json_build_object('user_id', u.user_id, 'name', u.name) AS created_by"
    ]

    db_handler = DatabaseRequestHandler("ut_tests AS ut")
    db_handler.set_select_columns([f"COUNT(*) OVER() AS count"] + select_columns)
    db_handler.add_join("LEFT JOIN users u ON ut.created_by = u.user_id")
    db_handler.add_constraint("ut.project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("ut.deleted_at IS NULL")
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
    for row in rows:
        del row["count"]
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])

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
        'conclusion_message': test_data.conclusion_message,
        'starting_path': test_data.starting_path,
        'require_mic': test_data.require_mic,
        'require_camera': test_data.require_camera,
        'guidelines': test_data.guidelines,
        'visibility': test_data.visibility,
    }

    # Execute the insert query
    new_test = db_handler.insert(data)
    test_id = new_test['test_id']

    new_test['created_at'] = TimeUTC.datetime_to_timestamp(new_test['created_at'])
    new_test['updated_at'] = TimeUTC.datetime_to_timestamp(new_test['updated_at'])

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

    live_count_sql = """
        WITH RankedSessions AS (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp DESC) as rn
            FROM ut_tests_signals
            WHERE test_id = %(test_id)s AND task_id IS NULL
        )
        SELECT COUNT(DISTINCT session_id) AS live_count
        FROM RankedSessions
        WHERE rn = 1 AND status = 'begin'
    """

    select_columns = [
        "ut.test_id",
        "ut.title",
        "ut.description",
        "ut.status",
        "ut.created_at",
        "ut.updated_at",
        "ut.starting_path",
        "ut.conclusion_message",
        "ut.require_mic",
        "ut.require_camera",
        "ut.guidelines",
        "ut.visibility",
        "json_build_object('id', u.user_id, 'name', u.name) AS created_by",
        "COALESCE((SELECT COUNT(*) FROM ut_tests_signals uts WHERE uts.test_id = ut.test_id AND uts.task_id IS NOT NULL AND uts.status in %(response_statuses)s AND uts.comment is NOT NULL), 0) AS responses_count"
        # f"({live_count_sql}) AS live_count",
    ]
    db_handler.add_param("response_statuses", ('done', 'skipped'))
    db_handler.set_select_columns(select_columns + [f"({tasks_sql}) AS tasks"])
    db_handler.add_join("LEFT JOIN users u ON ut.created_by = u.user_id")
    db_handler.add_constraint("ut.project_id = %(project_id)s", {'project_id': project_id})
    db_handler.add_constraint("ut.test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("ut.deleted_at IS NULL")

    row = db_handler.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")

    try:
        body = {
            "filter": {
                "uxtId": {
                    "values": [test_id],
                    "operator": "is"
                },
            },
        }

        live_sessions = assist.__get_live_sessions_ws(project_id, body)
        row['live_count'] = live_sessions['total']
    except Exception as e:
        logging.error(f"Failed to get live sessions count: {e}")
        row['live_count'] = 0

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

    result['created_at'] = TimeUTC.datetime_to_timestamp(result['created_at'])
    result['updated_at'] = TimeUTC.datetime_to_timestamp(result['updated_at'])

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


def ut_tests_sessions_live(project_id: int, test_id: int, page: int, limit: int):
    body = {
        "filter": {
            "uxtId": {
                "values": [
                    test_id
                ],
                "operator": "is"
            },
        },
        "pagination": {"limit": limit, "page": page},
    }

    return assist.__get_live_sessions_ws(project_id, body)


def ut_tests_sessions(project_id: int, test_id: int, page: int, limit: int, user_id: int = None, live: bool = False):
    handler = DatabaseRequestHandler("ut_tests_signals AS uts")
    handler.set_select_columns(["uts.session_id"])
    handler.add_constraint("uts.test_id = %(test_id)s", {'test_id': test_id})
    handler.add_constraint("uts.task_id is NULL")
    handler.set_pagination(page, limit)
    if user_id:
        handler.add_constraint("s.user_id = %(user_id)s", {'user_id': user_id})
    handler.add_join("JOIN sessions s ON s.session_id = uts.session_id")

    if live:
        handler.add_constraint("uts.duration IS NULL")
    else:
        handler.add_constraint("uts.status IN %(status_list)s", {'status_list': ('done', 'skipped')})

    session_ids = handler.fetchall()
    session_ids = [session['session_id'] for session in session_ids]
    sessions_list = sessions.search_sessions_by_ids(project_id=project_id, session_ids=session_ids)
    sessions_list['page'] = page

    return sessions_list


def get_responses(test_id: int, task_id: int, page: int = 1, limit: int = 10, query: str = None):
    db_handler = DatabaseRequestHandler("ut_tests_signals AS uts")
    db_handler.set_select_columns([
        "COUNT(*) OVER() AS count",
        "uts.status",
        "uts.timestamp",
        "uts.comment",
        "s.user_id",
    ])
    db_handler.add_constraint("uts.comment IS NOT NULL")
    db_handler.add_constraint("uts.status IN %(status_list)s", {'status_list': ('done', 'skipped')})
    db_handler.add_constraint("uts.test_id = %(test_id)s", {'test_id': test_id})
    db_handler.add_constraint("uts.task_id = %(task_id)s", {'task_id': task_id})
    db_handler.set_pagination(page, limit)

    db_handler.add_join("JOIN sessions s ON s.session_id = uts.session_id")

    if query:
        db_handler.add_constraint("uts.comment ILIKE %(query)s", {'query': f"%{query}%"})

    responses = db_handler.fetchall()

    count = responses[0]['count'] if responses else 0

    for response in responses:
        del response['count']

    return {
        "data": {
            "total": count,
            "list": responses,
            "page": page,
            "limit": limit
        }
    }


def get_statistics(test_id: int):
    try:
        handler = DatabaseRequestHandler("ut_tests_signals sig")
        results = handler.raw_query("""
            WITH TaskCounts AS (SELECT test_id, COUNT(*) as total_tasks
                    FROM ut_tests_tasks
                    GROUP BY test_id),
             CompletedSessions AS (SELECT s.session_id, s.test_id
                                   FROM ut_tests_signals s
                                   WHERE s.test_id = %(test_id)s
                                     AND s.status = 'done'
                                     AND s.task_id IS NOT NULL
                                   GROUP BY s.session_id, s.test_id
                                   HAVING COUNT(DISTINCT s.task_id) = (SELECT total_tasks FROM TaskCounts
                                    WHERE test_id = s.test_id))
        
        SELECT sig.test_id,
               sum(case when sig.task_id is null then 1 else 0 end)                                as tests_attempts,
               sum(case when sig.task_id is null and sig.status = 'skipped' then 1 else 0 end)     as tests_skipped,
               sum(case when sig.task_id is not null and sig.status = 'done' then 1 else 0 end)    as tasks_completed,
               sum(case when sig.task_id is not null and sig.status = 'skipped' then 1 else 0 end) as tasks_skipped,
               (SELECT COUNT(*) FROM CompletedSessions WHERE test_id = sig.test_id)                as completed_all_tasks
        FROM ut_tests_signals sig
                 LEFT JOIN TaskCounts tc ON sig.test_id = tc.test_id
        WHERE sig.status IN ('done', 'skipped')
          AND sig.test_id = %(test_id)s
        GROUP BY sig.test_id;
        """, params={
            'test_id': test_id
        })

        if results is None or len(results) == 0:
            return {
                "data": {
                    "tests_attempts": 0,
                    "tests_skipped": 0,
                    "tasks_completed": 0,
                    "tasks_skipped": 0,
                    "completed_all_tasks": 0
                }
            }

        return {
            "data": results[0]
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logging.error(f"Unexpected error occurred: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


def get_task_statistics(test_id: int):
    db_handler = DatabaseRequestHandler("ut_tests_tasks utt")
    db_handler.set_select_columns([
        "utt.task_id",
        "utt.title",
        "sum(case when uts.status = 'done' then 1 else 0 end) as completed",
        "avg(case when uts.status = 'done' then uts.duration else 0 end) as avg_completion_time",
        "sum(case when uts.status = 'skipped' then 1 else 0 end) as skipped"
    ])
    db_handler.add_join("JOIN ut_tests_signals uts ON utt.task_id = uts.task_id")
    db_handler.add_constraint("utt.test_id = %(test_id)s", {'test_id': test_id})
    db_handler.set_group_by("utt.task_id, utt.title")
    db_handler.set_sort_by("utt.task_id ASC")

    rows = db_handler.fetchall()

    return {
        "data": list_to_camel_case(rows)
    }
