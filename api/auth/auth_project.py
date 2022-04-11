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
        project_identifier = request.path_params[self.project_identifier]
        if (self.project_identifier == "projectId" \
            and projects.get_project(project_id=project_identifier, tenant_id=current_user.tenant_id) is None) \
                or (self.project_identifier.lower() == "projectKey" \
                    and projects.get_internal_project_id(project_key=project_identifier) is None):
            print("project not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found.")
