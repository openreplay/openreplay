from fastapi.security import SecurityScopes

import schemas_ee


def check(security_scopes: SecurityScopes, context: schemas_ee.CurrentContext):
    for scope in security_scopes.scopes:
        if scope not in context.permissions:
            return False
    return True
