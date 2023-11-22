from fastapi import Body, Depends

from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestRead, UTTestUpdate, UTTestDelete, SearchResult, \
    UTTestSearch, UTTestSessionsSearch, UTTestResponsesSearch, StatusEnum, UTTestStatusUpdate
from chalicelib.core.usability_testing import service
from or_dependencies import OR_context
from routers.base import get_routers
from schemas import schemas

public_app, app, app_apikey = get_routers()
tags = ["usability-tests"]


@app.post("/{project_id}/usability-tests/search", tags=tags)
async def search_ui_tests(
        project_id: int,
        search: UTTestSearch = Body(...,
                                    description="The search parameters including the query, page, limit, sort_by, "
                                                "and sort_order.")
):
    """
    Search for UT tests within a given project with pagination and optional sorting.

    - **project_id**: The unique identifier of the project to search within.
    - **search**: The search parameters including the query, page, limit, sort_by, and sort_order.
    """

    return service.search_ui_tests(project_id, search)


@app.post("/{project_id}/usability-tests", tags=tags)
async def create_ut_test(project_id: int, test_data: UTTestCreate,
                         context: schemas.CurrentContext = Depends(OR_context)):
    """
    Create a new UT test in the specified project.

    - **project_id**: The unique identifier of the project.
    - **test_data**: The data for the new UT test.
    """
    test_data.project_id = project_id
    test_data.created_by = context.user_id
    return service.create_ut_test(test_data)


@app.get("/{project_id}/usability-tests/{test_id}", tags=tags)
async def get_ut_test(project_id: int, test_id: int):
    """
    Retrieve a specific UT test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """
    return service.get_ut_test(project_id, test_id)


@app.delete("/{project_id}/usability-tests/{test_id}", tags=tags)
async def delete_ut_test(project_id: int, test_id: int):
    """
    Delete a specific UT test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test to be deleted.
    """
    return service.delete_ut_test(project_id, test_id)


@app.put("/{project_id}/usability-tests/{test_id}", tags=tags)
async def update_ut_test(project_id: int, test_id: int, test_update: UTTestUpdate):
    """
    Update a specific UT test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test to be updated.
    - **test_update**: The updated data for the UT test.
    """

    return service.update_ut_test(project_id, test_id, test_update)


@app.get("/{project_id}/usability-tests/{test_id}/sessions", tags=tags)
async def get_sessions(project_id: int, test_id: int, page: int = 1, limit: int = 10, context: schemas.CurrentContext = Depends(OR_context)):
    """
    Get sessions related to a specific UT test.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """

    user_id = context.user_id

    return service.ut_tests_sessions(project_id, user_id, test_id, page, limit)


@app.get("/{project_id}/usability-tests/{test_id}/responses/{task_id}", tags=tags)
async def get_responses(project_id: int, test_id: int, task_id: int, page: int = 1, limit: int = 10):
    """
    Get responses related to a specific UT test.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """
    return service.get_responses(project_id, test_id, task_id, page, limit)


@app.get("/{project_id}/usability-tests/{test_id}/statistics", tags=tags)
async def get_statistics(project_id: int, test_id: int):
    """
    Get statistics related to a specific UT test.

    :param project_id:
    :param test_id:
    :return:
    """
    return service.get_statistics(test_id=test_id)


@app.get("/{project_id}/usability-tests/{test_id}/task-statistics", tags=tags)
async def get_task_statistics(project_id: int, test_id: int):
    """
    Get statistics related to a specific UT test.

    :param project_id:
    :param test_id:
    :return:
    """
    return service.get_task_statistics(test_id=test_id)
