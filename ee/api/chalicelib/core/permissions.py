from fastapi.security import SecurityScopes

import schemas


def check(security_scopes: SecurityScopes, context: schemas.CurrentContext):
    for scope in security_scopes.scopes:
        if scope not in context.permissions:
            return False
    return True
