from fastapi.security import SecurityScopes

from chalicelib.core import permissions
from chalicelib.core.sessions.sessions_devtool import *

_get_urls = get_urls
SCOPES = SecurityScopes([schemas.Permissions.DEV_TOOLS])


def get_urls(session_id, project_id, context: schemas.CurrentContext, check_existence: bool = True):
    if not permissions.check(security_scopes=SCOPES, context=context):
        return []
    return _get_urls(session_id=session_id, project_id=project_id, context=context, check_existence=check_existence)
