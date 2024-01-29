from chalicelib.utils import pg_client


async def add_favorite_error(project_id, user_id, error_id):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(f"""INSERT INTO public.user_favorite_errors(user_id, error_id) 
                            VALUES (%(userId)s,%(error_id)s);""",
                        {"userId": user_id, "error_id": error_id})
        )
    return {"errorId": error_id, "favorite": True}


async def remove_favorite_error(project_id, user_id, error_id):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(f"""DELETE FROM public.user_favorite_errors                          
                            WHERE 
                                user_id = %(userId)s
                                AND error_id = %(error_id)s;""",
                        {"userId": user_id, "error_id": error_id})
        )
    return {"errorId": error_id, "favorite": False}


async def favorite_error(project_id, user_id, error_id):
    exists, favorite = await error_exists_and_favorite(user_id=user_id, error_id=error_id)
    if not exists:
        return {"errors": ["cannot bookmark non-rehydrated errors"]}
    if favorite:
        return await remove_favorite_error(project_id=project_id, user_id=user_id, error_id=error_id)
    return await add_favorite_error(project_id=project_id, user_id=user_id, error_id=error_id)


async def error_exists_and_favorite(user_id, error_id):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify(
                """SELECT errors.error_id AS exists, ufe.error_id AS favorite
                    FROM public.errors
                             LEFT JOIN (SELECT error_id FROM public.user_favorite_errors WHERE user_id = %(userId)s) AS ufe USING (error_id)
                    WHERE error_id = %(error_id)s;""",
                {"userId": user_id, "error_id": error_id})
        )
        r = await cur.fetchone()
        if r is None:
            return False, False
        return True, r.get("favorite") is not None
