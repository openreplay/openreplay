import logging

from decouple import config

import schemas
from chalicelib.core.sessions import sessions_mobs, sessions_devtool
from .sessions_favorite import add_favorite_session as _add_favorite_session, \
    remove_favorite_session as _remove_favorite_session, \
    favorite_session_exists
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils.storage import extra

logger = logging.getLogger(__name__)


def add_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    result = _add_favorite_session(context=context, project_id=project_id, session_id=session_id)
    if "data" in result:
        add_favorite_session_to_ch(project_id=project_id, user_id=context.user_id,
                                   session_id=session_id)
    return result


def remove_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    result = _remove_favorite_session(context=context, project_id=project_id, session_id=session_id)
    if "data" in result:
        remove_favorite_session_from_ch(project_id=project_id, user_id=context.user_id,
                                        session_id=session_id)
    return result


def favorite_session(context: schemas.CurrentContext, project_id, session_id):
    keys = sessions_mobs.__get_mob_keys(project_id=project_id, session_id=session_id)
    keys += sessions_mobs.__get_mob_keys_deprecated(session_id=session_id)  # To support old sessions
    keys += sessions_devtool.get_devtools_keys(project_id=project_id, session_id=session_id)

    if favorite_session_exists(user_id=context.user_id, session_id=session_id):
        tag = config('RETENTION_D_VALUE', default='default')

        for k in keys:
            try:
                extra.tag_session(file_key=k, tag_value=tag)
            except Exception as e:
                print(f"!!!Error while tagging: {k} to {tag} for removal")
                print(str(e))

        return remove_favorite_session(context=context, project_id=project_id, session_id=session_id)

    tag = config('RETENTION_L_VALUE', default='vault')

    for k in keys:
        try:
            extra.tag_session(file_key=k, tag_value=tag)
        except Exception as e:
            print(f"!!!Error while tagging: {k} to {tag} for vault")
            print(str(e))

    return add_favorite_session(context=context, project_id=project_id, session_id=session_id)


def add_favorite_session_to_ch(project_id, user_id, session_id, sign=1):
    try:
        with ch_client.ClickHouseClient() as cur:
            query = f"""INSERT INTO {exp_ch_helper.get_user_favorite_sessions_table()}(project_id,user_id, session_id, sign) 
                        VALUES (%(project_id)s,%(userId)s,%(sessionId)s,%(sign)s);"""
            params = {"userId": user_id, "sessionId": session_id, "project_id": project_id, "sign": sign}
            cur.execute(query=query, parameters=params)

    except Exception as err:
        logger.error("------- Exception while adding favorite session to CH")
        logger.error(err)


def remove_favorite_session_from_ch(project_id, user_id, session_id):
    add_favorite_session_to_ch(project_id=project_id, user_id=user_id, session_id=session_id, sign=-1)
