from fastapi import HTTPException, Depends
from fastapi.security import SecurityScopes

import schemas_ee
from or_dependencies import OR_context


def check(security_scopes: SecurityScopes, context: schemas_ee.CurrentContext = Depends(OR_context)):
    for scope in security_scopes.scopes:
        if scope not in context.permissions:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
            )
    