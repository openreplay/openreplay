import logging

from decouple import config

import schemas
from chalicelib.core.sessions import sessions_mobs, sessions_devtool
from chalicelib.utils.storage import extra
from .sessions_favorite import add_favorite_session, remove_favorite_session, favorite_session_exists

logger = logging.getLogger(__name__)


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
