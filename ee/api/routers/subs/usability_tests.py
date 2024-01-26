from fastapi import Body, Depends

from chalicelib.core.usability_testing import service
from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestUpdate, UTTestSearch
from or_dependencies import OR_context
from routers.base import get_routers
from schemas import schemas

public_app, app, app_apikey = get_routers()
tags = ["usability-tests"]


@app.post('/{projectId}/usability-tests/search', tags=tags)
async def search_ui_tests(
        projectId: int,
        search: UTTestSearch = Body(...,
                                    description="The search parameters including the query, page, limit, sort_by, "
                                                "and sort_order.")
):
    """
    Search for UT tests within a given project with pagination and optional sorting.

    - **projectId**: The unique identifier of the project to search within.
    - **search**: The search parameters including the query, page, limit, sort_by, and sort_order.
    """

    return service.search_ui_tests(projectId, search)


@app.post('/{projectId}/usability-tests', tags=tags)
async def create_ut_test(projectId: int, test_data: UTTestCreate,
                         context: schemas.CurrentContext = Depends(OR_context)):
    """
    Create a new UT test in the specified project.

    - **projectId**: The unique identifier of the project.
    - **test_data**: The data for the new UT test.
    """
    test_data.project_id = projectId
    test_data.created_by = context.user_id
    return service.create_ut_test(test_data)


@app.get('/{projectId}/usability-tests/{test_id}', tags=tags)
async def get_ut_test(projectId: int, test_id: int):
    """
    Retrieve a specific UT test by its ID.

    - **projectId**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """
    return service.get_ut_test(projectId, test_id)


@app.delete('/{projectId}/usability-tests/{test_id}', tags=tags)
async def delete_ut_test(projectId: int, test_id: int):
    """
    Delete a specific UT test by its ID.

    - **projectId**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test to be deleted.
    """
    return service.delete_ut_test(projectId, test_id)


@app.put('/{projectId}/usability-tests/{test_id}', tags=tags)
async def update_ut_test(projectId: int, test_id: int, test_update: UTTestUpdate):
    """
    Update a specific UT test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test to be updated.
    - **test_update**: The updated data for the UT test.
    """

    return service.update_ut_test(projectId, test_id, test_update)


@app.get('/{projectId}/usability-tests/{test_id}/sessions', tags=tags)
async def get_sessions(projectId: int, test_id: int, page: int = 1, limit: int = 10,
                       live: bool = False,
                       user_id: str = None):
    """
    Get sessions related to a specific UT test.

    - **projectId**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """

    if live:
        return service.ut_tests_sessions_live(projectId, test_id, page, limit)
    else:
        return service.ut_tests_sessions(projectId, test_id, page, limit, user_id, live)


@app.get('/{projectId}/usability-tests/{test_id}/responses/{task_id}', tags=tags)
async def get_responses(projectId: int, test_id: int, task_id: int, page: int = 1, limit: int = 10, query: str = None):
    """
    Get responses related to a specific UT test.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UT test.
    """
    return service.get_responses(test_id, task_id, page, limit, query)


@app.get('/{projectId}/usability-tests/{test_id}/statistics', tags=tags)
async def get_statistics(projectId: int, test_id: int):
    """
    Get statistics related to a specific UT test.

    :param test_id:
    :return:
    """
    return service.get_statistics(test_id=test_id)


@app.get('/{projectId}/usability-tests/{test_id}/task-statistics', tags=tags)
async def get_task_statistics(projectId: int, test_id: int):
    """
    Get statistics related to a specific UT test.

    :param test_id:
    :return:
    """
    return service.get_task_statistics(test_id=test_id)
