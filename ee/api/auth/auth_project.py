from typing import Optional

from fastapi import Request
from starlette import status
from starlette.exceptions import HTTPException

from schemas import CurrentContext

# Add it as a dependency to the main app
class ProjectAuthorizer:
    def __init__(self):
        print(">>>ProjectAuthorizer")

    async def __call__(self, request: Request) -> Optional[CurrentContext]:
        print(">>>ProjectAuthorizer")
        print(request.path_params)
        # TODO: project authorization
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
