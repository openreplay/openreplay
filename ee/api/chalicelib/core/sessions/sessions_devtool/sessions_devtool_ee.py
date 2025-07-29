from fastapi.security import SecurityScopes

import schemas
from chalicelib.core import permissions
from .sessions_devtool import get_urls as _get_urls

SCOPES = SecurityScopes([schemas.Permissions.DEV_TOOLS])
SERVICE_SCOPES = SecurityScopes([schemas.ServicePermissions.DEV_TOOLS])


def get_urls(session_id, project_id, context: schemas.CurrentContext, check_existence: bool = True):
    if not permissions.check(security_scopes=SCOPES, context=context) \
            and not permissions.check(security_scopes=SERVICE_SCOPES, context=context):
        return []
    return _get_urls(session_id=session_id, project_id=project_id, context=context, check_existence=check_existence)
