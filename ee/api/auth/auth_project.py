import logging

from fastapi import Request
from starlette import status
from starlette.exceptions import HTTPException

import schemas
from chalicelib.core import projects
from or_dependencies import OR_context

logger = logging.getLogger(__name__)


class ProjectAuthorizer:
    def __init__(self, project_identifier):
        self.project_identifier: str = project_identifier

    async def __call__(self, request: Request) -> None:
        if len(request.path_params.keys()) == 0 or request.path_params.get(self.project_identifier) is None:
            return
        current_user: schemas.CurrentContext = await OR_context(request)
        value = request.path_params[self.project_identifier]
        user_id = current_user.user_id if request.state.authorizer_identity == "jwt" else None
        current_project = None
        if self.project_identifier == "projectId" \
                and (isinstance(value, int) or (isinstance(value, str) and value.isnumeric())) \
                and projects.is_authorized(project_id=value, tenant_id=current_user.tenant_id,
                                           user_id=user_id):
            current_project = projects.get_project(tenant_id=current_user.tenant_id, project_id=value)
        elif self.project_identifier == "projectKey":
            current_project = projects.get_by_project_key(project_key=value)
            if current_project is not None \
                    and request.state.authorizer_identity == "jwt" \
                    and not projects.is_authorized(project_id=current_project["projectId"],
                                                   tenant_id=current_user.tenant_id,
                                                   user_id=user_id):
                current_project = None

        if current_project is None:
            logger.debug(f"unauthorized project {self.project_identifier}:{value}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized project.")
        else:
            current_project = schemas.CurrentProjectContext(projectId=current_project["projectId"],
                                                            projectKey=current_project["projectKey"],
                                                            platform=current_project["platform"],
                                                            name=current_project["name"])
            request.state.currentContext.project = current_project
