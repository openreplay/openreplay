from chalicelib.utils import pg_client


async def add_viewed_error(project_id, user_id, error_id):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify("""INSERT INTO public.user_viewed_errors(user_id, error_id) 
                            VALUES (%(userId)s,%(error_id)s);""",
                        {"userId": user_id, "error_id": error_id})
        )


async def viewed_error_exists(user_id, error_id):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(
            """SELECT 
                    errors.error_id AS hydrated,
                    COALESCE((SELECT TRUE
                                         FROM public.user_viewed_errors AS ve
                                         WHERE ve.error_id = %(error_id)s
                                           AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed                                                
                FROM public.errors
                WHERE error_id = %(error_id)s""",
            {"userId": user_id, "error_id": error_id})
        await cur.execute(
            query=query
        )
        r = await cur.fetchone()
        if r:
            return r.get("viewed")
    return True


async def viewed_error(project_id, user_id, error_id):
    if await viewed_error_exists(user_id=user_id, error_id=error_id):
        return None
    return await add_viewed_error(project_id=project_id, user_id=user_id, error_id=error_id)
