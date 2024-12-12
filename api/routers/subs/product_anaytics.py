import schemas
from chalicelib.core.metrics import product_anaytics2
from fastapi import Depends
from or_dependencies import OR_context
from routers.base import get_routers


public_app, app, app_apikey = get_routers()


@app.post('/{projectId}/events/search', tags=["dashboard"])
def search_events(projectId: int,
                  # data: schemas.CreateDashboardSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return product_anaytics2.search_events(project_id=projectId, data={})
