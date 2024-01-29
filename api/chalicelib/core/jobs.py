from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.core import sessions_mobs, sessions_devtool


class Actions:
    DELETE_USER_DATA = "delete_user_data"


class JobStatus:
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


async def get(job_id, project_id):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(
            """SELECT *
               FROM public.jobs
               WHERE job_id = %(job_id)s
                    AND project_id= %(project_id)s;""",
            {"job_id": job_id, "project_id": project_id}
        )
        await cur.execute(query=query)
        data = await cur.fetchone()
        if data is None:
            return {}

        format_datetime(data)

    return helper.dict_to_camel_case(data)


async def get_all(project_id):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(
            """SELECT *
               FROM public.jobs
               WHERE project_id = %(project_id)s;""",
            {"project_id": project_id}
        )
        await cur.execute(query=query)
        data = await cur.fetchall()
        for record in data:
            format_datetime(record)
    return helper.list_to_camel_case(data)


async def create(project_id, user_id):
    async with pg_client.cursor() as cur:
        job = {"status": "scheduled",
               "project_id": project_id,
               "action": Actions.DELETE_USER_DATA,
               "reference_id": user_id,
               "description": f"Delete user sessions of userId = {user_id}",
               "start_at": TimeUTC.to_human_readable(TimeUTC.midnight(1))}

        query = cur.mogrify(
            """INSERT INTO public.jobs(project_id, description, status, action,reference_id, start_at)
               VALUES (%(project_id)s, %(description)s, %(status)s, %(action)s,%(reference_id)s, %(start_at)s)
               RETURNING *;""", job)

        await cur.execute(query=query)

        r = await cur.fetchone()
        format_datetime(r)
        record = helper.dict_to_camel_case(r)
    return record


async def cancel_job(job_id, job):
    job["status"] = JobStatus.CANCELLED
    await update(job_id=job_id, job=job)


async def update(job_id, job):
    async with pg_client.cursor() as cur:
        job_data = {
            "job_id": job_id,
            "errors": job.get("errors"),
            **job
        }

        query = cur.mogrify(
            """UPDATE public.jobs
               SET updated_at = timezone('utc'::text, now()),
                   status = %(status)s,
                   errors = %(errors)s
               WHERE job_id = %(job_id)s
               RETURNING *;""", job_data)

        await cur.execute(query=query)

        r = await cur.fetchone()
        format_datetime(r)
        record = helper.dict_to_camel_case(r)
    return record


def format_datetime(r):
    r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
    r["updated_at"] = TimeUTC.datetime_to_timestamp(r["updated_at"])
    r["start_at"] = TimeUTC.datetime_to_timestamp(r["start_at"])


async def __get_session_ids_by_user_ids(project_id, user_ids):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(
            """SELECT session_id 
               FROM public.sessions
               WHERE project_id = %(project_id)s 
                    AND user_id IN %(userId)s
               LIMIT 1000;""",
            {"project_id": project_id, "userId": tuple(user_ids)})
        await cur.execute(query=query)
        ids = await cur.fetchall()
    return [s["session_id"] for s in ids]


async def __delete_sessions_by_session_ids(session_ids):
    async with pg_client.cursor(unlimited_query=True) as cur:
        query = cur.mogrify(
            """DELETE FROM public.sessions
               WHERE session_id IN %(session_ids)s""",
            {"session_ids": tuple(session_ids)}
        )
        await cur.execute(query=query)


def __delete_session_mobs_by_session_ids(session_ids, project_id):
    sessions_mobs.delete_mobs(session_ids=session_ids, project_id=project_id)
    sessions_devtool.delete_mobs(session_ids=session_ids, project_id=project_id)


async def get_scheduled_jobs():
    async with pg_client.cursor() as cur:
        query = cur.mogrify(
            """SELECT * 
               FROM public.jobs
               WHERE status = %(status)s 
                    AND start_at <= (now() at time zone 'utc');""",
            {"status": JobStatus.SCHEDULED})
        await cur.execute(query=query)
        data = await cur.fetchall()
    return helper.list_to_camel_case(data)


async def execute_jobs():
    jobs = await get_scheduled_jobs()
    for job in jobs:
        print(f"Executing jobId:{job['jobId']}")
        try:
            if job["action"] == Actions.DELETE_USER_DATA:
                session_ids = await __get_session_ids_by_user_ids(project_id=job["projectId"],
                                                            user_ids=[job["referenceId"]])
                if len(session_ids) > 0:
                    print(f"Deleting {len(session_ids)} sessions")
                    await __delete_sessions_by_session_ids(session_ids=session_ids)
                    await __delete_session_mobs_by_session_ids(session_ids=session_ids, project_id=job["projectId"])
            else:
                raise Exception(f"The action '{job['action']}' not supported.")

            job["status"] = JobStatus.COMPLETED
            print(f"Job completed {job['jobId']}")
        except Exception as e:
            job["status"] = JobStatus.FAILED
            job["errors"] = str(e)
            print(f"Job failed {job['jobId']}")

        await update(job["jobId"], job)
