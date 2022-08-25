from fastapi import Request
from starlette import status
from starlette.exceptions import HTTPException

import schemas
from chalicelib.core import projects
from or_dependencies import OR_context


class ProjectAuthorizer:
    def __init__(self, project_identifier):
        self.project_identifier: str = project_identifier

    async def __call__(self, request: Request) -> None:
        if len(request.path_params.keys()) == 0 or request.path_params.get(self.project_identifier) is None:
            return
        current_user: schemas.CurrentContext = await OR_context(request)
        value = request.path_params[self.project_identifier]
        user_id = current_user.user_id if request.state.authorizer_identity == "jwt" else None
        if (self.project_identifier == "projectId" \
            and not projects.is_authorized(project_id=value, tenant_id=current_user.tenant_id,
                                           user_id=user_id)) \
                or (self.project_identifier == "projectKey" \
                    and not projects.is_authorized(
                    project_id=projects.get_internal_project_id(value),
                    tenant_id=current_user.tenant_id, user_id=user_id)):
            print("unauthorized project")
            print(value)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized project.")
