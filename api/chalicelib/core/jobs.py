from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.core import sessions, sessions_mobs


class Actions:
    DELETE_USER_DATA = "delete_user_data"


class JobStatus:
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


def get(job_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT
                *
            FROM public.jobs
            WHERE job_id = %(job_id)s;""",
            {"job_id": job_id}
        )
        cur.execute(query=query)
        data = cur.fetchone()
        if data is None:
            return {}

        format_datetime(data)

    return helper.dict_to_camel_case(data)


def get_all(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT
                *
            FROM public.jobs
            WHERE project_id = %(project_id)s;""",
            {"project_id": project_id}
        )
        cur.execute(query=query)
        data = cur.fetchall()
        for record in data:
            format_datetime(record)
    return helper.list_to_camel_case(data)


def create(project_id, data):
    with pg_client.PostgresClient() as cur:
        job = {
            "status": "scheduled",
            "project_id": project_id,
            **data
        }

        query = cur.mogrify("""\
            INSERT INTO public.jobs(
                project_id, description, status, action,
                reference_id, start_at
            )
            VALUES (
                %(project_id)s, %(description)s, %(status)s, %(action)s,
                %(reference_id)s, %(start_at)s
            ) RETURNING *;""", job)

        cur.execute(query=query)

        r = cur.fetchone()
        format_datetime(r)
        record = helper.dict_to_camel_case(r)
    return record


def cancel_job(job_id, job):
    job["status"] = JobStatus.CANCELLED
    update(job_id=job_id, job=job)


def update(job_id, job):
    with pg_client.PostgresClient() as cur:
        job_data = {
            "job_id": job_id,
            "errors": job.get("errors"),
            **job
        }

        query = cur.mogrify("""\
            UPDATE public.jobs
            SET
                updated_at = timezone('utc'::text, now()),
                status = %(status)s,
                errors = %(errors)s
            WHERE
                job_id = %(job_id)s RETURNING *;""", job_data)

        cur.execute(query=query)

        r = cur.fetchone()
        format_datetime(r)
        record = helper.dict_to_camel_case(r)
    return record


def format_datetime(r):
    r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
    r["updated_at"] = TimeUTC.datetime_to_timestamp(r["updated_at"])
    r["start_at"] = TimeUTC.datetime_to_timestamp(r["start_at"])


def get_scheduled_jobs():
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT * FROM public.jobs
            WHERE status = %(status)s AND start_at <= (now() at time zone 'utc');""",
            {"status": JobStatus.SCHEDULED}
        )
        cur.execute(query=query)
        data = cur.fetchall()
        for record in data:
            format_datetime(record)

    return helper.list_to_camel_case(data)


def execute_jobs():
    jobs = get_scheduled_jobs()
    if len(jobs) == 0:
        # No jobs to execute
        return

    for job in jobs:
        print(f"job can be executed {job['id']}")
        try:
            if job["action"] == Actions.DELETE_USER_DATA:
                session_ids = sessions.get_session_ids_by_user_ids(
                    project_id=job["projectId"], user_ids=job["referenceId"]
                )

                sessions.delete_sessions_by_session_ids(session_ids)
                sessions_mobs.delete_mobs(session_ids)
            else:
                raise Exception(f"The action {job['action']} not supported.")

            job["status"] = JobStatus.COMPLETED
            print(f"job completed {job['id']}")
        except Exception as e:
            job["status"] = JobStatus.FAILED
            job["error"] = str(e)
            print(f"job failed {job['id']}")

        update(job["job_id"], job)


def group_user_ids_by_project_id(jobs, now):
    project_id_user_ids = {}
    for job in jobs:
        if job["startAt"] > now:
            continue

        project_id = job["projectId"]
        if project_id not in project_id_user_ids:
            project_id_user_ids[project_id] = []

        project_id_user_ids[project_id].append(job)

    return project_id_user_ids
