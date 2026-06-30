from fastapi import Depends, Body, BackgroundTasks
from fastapi import HTTPException

import schemas
from chalicelib.core.mcp import authorizers, tracer
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.post('/v1/mcp/authorize', tags=["mcp"])
def authorize_mcp_app(background_tasks: BackgroundTasks,
                      data: schemas.MCP.AuthorizeSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    if not (context.email.endswith("asayer.io") or context.email.endswith("openreplay.com")):
        raise HTTPException(status_code=401, detail="Unauthorized")
    authorizers.store_token_request(data=data, cotext=context)
    background_tasks.add_task(tracer.store_client_id,
                              user_id=context.user_id,
                              client_id=data.client_id)
    return {"data": {"success": True}}


@public_app.get("/v1/mcp/auth-status", tags=["mcp"])
def get_mcp_jwt(client_id: str, state: str):
    jwt = authorizers.get_token_by_state(client_id=client_id, state=state)
    if jwt is None:
        raise HTTPException(status_code=404, detail="Unauthorized")
    return {"jwt": jwt}
