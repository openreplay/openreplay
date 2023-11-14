from fastapi import Body

from chalicelib.core.usability_testing.schema import UTTestCreate, UTTestRead, UTTestUpdate, UTTestDelete, SearchResult, \
    UTTestSearch
from chalicelib.core.usability_testing import service
from routers.base import get_routers

public_app, app, app_apikey = get_routers()
tags = ["usability-tests"]


@app.post("/{project_id}/ui-tests/search", response_model=SearchResult, tags=tags)
async def search_ui_tests(
        project_id: int,
        search: UTTestSearch = Body(...,
                                    description="The search parameters including the query, page, limit, sort_by, "
                                                "and sort_order.")
):
    """
    Search for UI tests within a given project with pagination and optional sorting.

    - **project_id**: The unique identifier of the project to search within.
    - **search**: The search parameters including the query, page, limit, sort_by, and sort_order.
    """

    return service.search_ui_tests(project_id, search)


@app.post("/{project_id}/ui-tests", response_model=UTTestRead, tags=tags)
async def create_ut_test(project_id: int, test_data: UTTestCreate):
    """
    Create a new UI test in the specified project.

    - **project_id**: The unique identifier of the project.
    - **test_data**: The data for the new UI test.
    """
    return service.create_ut_test(project_id, test_data)


@app.get("/{project_id}/ui-tests/{test_id}", response_model=UTTestRead, tags=tags)
async def get_ut_test(project_id: int, test_id: int):
    """
    Retrieve a specific UI test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UI test.
    """
    return service.get_ut_test(project_id, test_id)


@app.delete("/{project_id}/ui-tests/{test_id}", response_model=UTTestDelete, tags=tags)
async def delete_ut_test(project_id: int, test_id: int):
    """
    Delete a specific UI test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UI test to be deleted.
    """
    return service.delete_ut_test(project_id, test_id)


@app.put("/{project_id}/ui-tests/{test_id}", response_model=UTTestRead, tags=tags)
async def update_ut_test(project_id: int, test_id: int, test_update: UTTestUpdate):
    """
    Update a specific UI test by its ID.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UI test to be updated.
    - **test_update**: The updated data for the UI test.
    """

    return service.update_ut_test(project_id, test_id, test_update)


# Assuming you have schemas for the session and response
@app.get("/{project_id}/ui-tests/{test_id}/sessions", tags=tags)
async def get_sessions(project_id: int, test_id: int):
    """
    Get sessions related to a specific UI test.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UI test.
    """

    return service.get_sessions(project_id, test_id)


@app.get("/{project_id}/ui-tests/{test_id}/responses", tags=tags)
async def get_responses(project_id: int, test_id: int):
    """
    Get responses related to a specific UI test.

    - **project_id**: The unique identifier of the project.
    - **test_id**: The unique identifier of the UI test.
    """
    return service.get_responses(project_id, test_id)
