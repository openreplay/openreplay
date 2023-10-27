from typing import Union

from fastapi import Body, Depends, Request

import schemas
from chalicelib.core import dashboards, custom_metrics, funnels
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.post('/{projectId}/dashboards', tags=["dashboard"])
def create_dashboards(projectId: int, data: schemas.CreateDashboardSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards.create_dashboard(project_id=projectId, user_id=context.user_id, data=data)


@app.get('/{projectId}/dashboards', tags=["dashboard"])
def get_dashboards(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.get_dashboards(project_id=projectId, user_id=context.user_id)}


@app.get('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def get_dashboard(projectId: int, dashboardId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = dashboards.get_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)
    if data is None:
        return {"errors": ["dashboard not found"]}
    return {"data": data}


@app.put('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def update_dashboard(projectId: int, dashboardId: int, data: schemas.EditDashboardSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.update_dashboard(project_id=projectId, user_id=context.user_id,
                                                dashboard_id=dashboardId, data=data)}


@app.delete('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def delete_dashboard(projectId: int, dashboardId: int, _=Body(None),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards.delete_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)


@app.get('/{projectId}/dashboards/{dashboardId}/pin', tags=["dashboard"])
def pin_dashboard(projectId: int, dashboardId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.pin_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)}


@app.post('/{projectId}/dashboards/{dashboardId}/cards', tags=["cards"])
def add_card_to_dashboard(projectId: int, dashboardId: int,
                          data: schemas.AddWidgetToDashboardPayloadSchema = Body(...),
                          context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.add_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                          data=data)}


@app.post('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
# @app.put('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
def create_metric_and_add_to_dashboard(projectId: int, dashboardId: int,
                                       data: schemas.CardSchema = Body(...),
                                       context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.create_metric_add_widget(project_id=projectId, user_id=context.user_id,
                                                        dashboard_id=dashboardId, data=data)}


@app.put('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
def update_widget_in_dashboard(projectId: int, dashboardId: int, widgetId: int,
                               data: schemas.UpdateWidgetPayloadSchema = Body(...),
                               context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards.update_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                    widget_id=widgetId, data=data)


@app.delete('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
def remove_widget_from_dashboard(projectId: int, dashboardId: int, widgetId: int, _=Body(None),
                                 context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards.remove_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                    widget_id=widgetId)


@app.post('/{projectId}/cards/try', tags=["cards"])
def try_card(projectId: int, data: schemas.CardSchema = Body(...),
             context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.get_chart(project_id=projectId, data=data, user_id=context.user_id)}


@app.post('/{projectId}/cards/try/sessions', tags=["cards"])
def try_card_sessions(projectId: int, data: schemas.CardSessionsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_sessions(project_id=projectId, user_id=context.user_id, data=data)
    return {"data": data}


@app.post('/{projectId}/cards/try/issues', tags=["cards"])
def try_card_issues(projectId: int, data: schemas.CardSchema = Body(...),
                    context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.get_issues(project_id=projectId, user_id=context.user_id, data=data)}


@app.get('/{projectId}/cards', tags=["cards"])
def get_cards(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.get_all(project_id=projectId, user_id=context.user_id)}


@app.post('/{projectId}/cards', tags=["cards"])
def create_card(projectId: int, data: schemas.CardSchema = Body(...),
                context: schemas.CurrentContext = Depends(OR_context)):
    return custom_metrics.create_card(project_id=projectId, user_id=context.user_id, data=data)


@app.post('/{projectId}/cards/search', tags=["cards"])
def search_cards(projectId: int, data: schemas.SearchCardsSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.search_all(project_id=projectId, user_id=context.user_id, data=data)}


@app.get('/{projectId}/cards/{metric_id}', tags=["cards"])
def get_card(projectId: int, metric_id: Union[int, str], context: schemas.CurrentContext = Depends(OR_context)):
    if metric_id.isnumeric():
        metric_id = int(metric_id)
    else:
        return {"errors": ["invalid card_id"]}
    data = custom_metrics.get_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id)
    if data is None:
        return {"errors": ["card not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/sessions', tags=["cards"])
def get_card_sessions(projectId: int, metric_id: int,
                      data: schemas.CardSessionsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_sessions_by_card_id(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                                  data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/issues', tags=["cards"])
def get_card_funnel_issues(projectId: int, metric_id: Union[int, str],
                           data: schemas.CardSessionsSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if metric_id.isnumeric():
        metric_id = int(metric_id)
    else:
        return {"errors": ["invalid card_id"]}

    data = custom_metrics.get_funnel_issues(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                            data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/issues/{issueId}/sessions', tags=["dashboard"])
def get_metric_funnel_issue_sessions(projectId: int, metric_id: int, issueId: str,
                                     data: schemas.CardSessionsSchema = Body(...),
                                     context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_funnel_sessions_by_issue(project_id=projectId, user_id=context.user_id,
                                                       metric_id=metric_id, issue_id=issueId, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/errors', tags=["dashboard"])
def get_card_errors_list(projectId: int, metric_id: int,
                         data: schemas.CardSessionsSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_errors_list(project_id=projectId, user_id=context.user_id,
                                          metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/chart', tags=["card"])
def get_card_chart(projectId: int, metric_id: int, request: Request, data: schemas.CardSessionsSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.make_chart_from_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                               data=data)
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}', tags=["dashboard"])
def update_card(projectId: int, metric_id: int, data: schemas.CardSchema = Body(...),
                context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.update_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/status', tags=["dashboard"])
def update_card_state(projectId: int, metric_id: int,
                      data: schemas.UpdateCardStatusSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": custom_metrics.change_state(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                            status=data.active)}


@app.delete('/{projectId}/cards/{metric_id}', tags=["dashboard"])
def delete_card(projectId: int, metric_id: int, _=Body(None),
                context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.delete_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id)}
