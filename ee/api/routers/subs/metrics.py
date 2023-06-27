from typing import Union

from fastapi import Body, Depends, Request

import schemas
import schemas_ee
from chalicelib.core import dashboards, custom_metrics, funnels
from or_dependencies import OR_context, OR_scope
from routers.base import get_routers
from schemas_ee import Permissions

public_app, app, app_apikey = get_routers([OR_scope(Permissions.metrics)])


@app.post('/{projectId}/dashboards', tags=["dashboard"])
@app.put('/{projectId}/dashboards', tags=["dashboard"])
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


@app.post('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
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
@app.post('/{projectId}/dashboards/{dashboardId}/widgets', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}/widgets', tags=["dashboard"])
def add_card_to_dashboard(projectId: int, dashboardId: int,
                          data: schemas.AddWidgetToDashboardPayloadSchema = Body(...),
                          context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.add_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                          data=data)}


@app.post('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
def create_metric_and_add_to_dashboard(projectId: int, dashboardId: int,
                                       data: schemas_ee.CardSchema = Body(...),
                                       context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards.create_metric_add_widget(project_id=projectId, user_id=context.user_id,
                                                        dashboard_id=dashboardId, data=data)}


@app.post('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
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


# @app.post('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}/chart', tags=["dashboard"])
# def get_widget_chart(projectId: int, dashboardId: int, widgetId: int,
#                      data: schemas.CardChartSchema = Body(...),
#                      context: schemas.CurrentContext = Depends(OR_context)):
#     data = dashboards.make_chart_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
#                                         widget_id=widgetId, data=data)
#     if data is None:
#         return {"errors": ["widget not found"]}
#     return {"data": data}


@app.post('/{projectId}/cards/try', tags=["cards"])
@app.post('/{projectId}/metrics/try', tags=["dashboard"])
@app.put('/{projectId}/metrics/try', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/try', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics/try', tags=["customMetrics"])
def try_card(projectId: int, data: schemas_ee.CardSchema = Body(...),
             context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.merged_live(project_id=projectId, data=data, user_id=context.user_id)}


@app.post('/{projectId}/cards/try/sessions', tags=["cards"])
@app.post('/{projectId}/metrics/try/sessions', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/try/sessions', tags=["customMetrics"])
def try_card_sessions(projectId: int, data: schemas.CardSessionsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.try_sessions(project_id=projectId, user_id=context.user_id, data=data)
    return {"data": data}


@app.post('/{projectId}/cards/try/issues', tags=["cards"])
@app.post('/{projectId}/metrics/try/issues', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/try/issues', tags=["customMetrics"])
def try_card_funnel_issues(projectId: int, data: schemas.CardSessionsSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if len(data.series) == 0:
        return {"data": []}
    data.series[0].filter.startDate = data.startTimestamp
    data.series[0].filter.endDate = data.endTimestamp
    data = funnels.get_issues_on_the_fly_widget(project_id=projectId, data=data.series[0].filter)
    return {"data": data}


@app.get('/{projectId}/cards', tags=["cards"])
@app.get('/{projectId}/metrics', tags=["dashboard"])
@app.get('/{projectId}/custom_metrics', tags=["customMetrics"])
def get_cards(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.get_all(project_id=projectId, user_id=context.user_id)}


@app.post('/{projectId}/cards', tags=["cards"])
@app.post('/{projectId}/metrics', tags=["dashboard"])
@app.put('/{projectId}/metrics', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics', tags=["customMetrics"])
def create_card(projectId: int, data: schemas_ee.CardSchema = Body(...),
                context: schemas.CurrentContext = Depends(OR_context)):
    return custom_metrics.create(project_id=projectId, user_id=context.user_id, data=data)


@app.post('/{projectId}/cards/search', tags=["cards"])
@app.post('/{projectId}/metrics/search', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/search', tags=["customMetrics"])
def search_cards(projectId: int, data: schemas.SearchCardsSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.search_all(project_id=projectId, user_id=context.user_id, data=data)}


@app.get('/{projectId}/cards/{metric_id}', tags=["cards"])
@app.get('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.get('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def get_card(projectId: int, metric_id: Union[int, str], context: schemas.CurrentContext = Depends(OR_context)):
    if not isinstance(metric_id, int):
        return {"errors": ["invalid card_id"]}
    data = custom_metrics.get_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id)
    if data is None:
        return {"errors": ["card not found"]}
    return {"data": data}


# @app.get('/{projectId}/cards/{metric_id}/thumbnail', tags=["cards"])
# def sign_thumbnail_for_upload(projectId: int, metric_id: Union[int, str],
#                               context: schemas.CurrentContext = Depends(OR_context)):
#     if not isinstance(metric_id, int):
#         return {"errors": ["invalid card_id"]}
#     return custom_metrics.add_thumbnail(metric_id=metric_id, user_id=context.user_id, project_id=projectId)


@app.post('/{projectId}/cards/{metric_id}/sessions', tags=["cards"])
@app.post('/{projectId}/metrics/{metric_id}/sessions', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/sessions', tags=["customMetrics"])
def get_card_sessions(projectId: int, metric_id: int,
                      data: schemas.CardSessionsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_sessions(project_id=projectId, user_id=context.user_id, metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/issues', tags=["cards"])
@app.post('/{projectId}/metrics/{metric_id}/issues', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/issues', tags=["customMetrics"])
def get_card_funnel_issues(projectId: int, metric_id: Union[int, str],
                           data: schemas.CardSessionsSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if not isinstance(metric_id, int):
        return {"errors": [f"invalid card_id: {metric_id}"]}

    data = custom_metrics.get_funnel_issues(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                            data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/issues/{issueId}/sessions', tags=["dashboard"])
@app.post('/{projectId}/metrics/{metric_id}/issues/{issueId}/sessions', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/issues/{issueId}/sessions', tags=["customMetrics"])
def get_metric_funnel_issue_sessions(projectId: int, metric_id: int, issueId: str,
                                     data: schemas.CardSessionsSchema = Body(...),
                                     context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_funnel_sessions_by_issue(project_id=projectId, user_id=context.user_id,
                                                       metric_id=metric_id, issue_id=issueId, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/errors', tags=["dashboard"])
@app.post('/{projectId}/metrics/{metric_id}/errors', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/errors', tags=["customMetrics"])
def get_custom_metric_errors_list(projectId: int, metric_id: int,
                                  data: schemas.CardSessionsSchema = Body(...),
                                  context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_errors_list(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                          data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/chart', tags=["card"])
@app.post('/{projectId}/metrics/{metric_id}/chart', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/chart', tags=["customMetrics"])
def get_card_chart(projectId: int, metric_id: int, request: Request, data: schemas.CardChartSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.make_chart_from_card(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                               data=data)
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}', tags=["dashboard"])
@app.post('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.put('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def update_custom_metric(projectId: int, metric_id: int, data: schemas_ee.UpdateCardSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.update(project_id=projectId, user_id=context.user_id, metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/cards/{metric_id}/status', tags=["dashboard"])
@app.post('/{projectId}/metrics/{metric_id}/status', tags=["dashboard"])
@app.put('/{projectId}/metrics/{metric_id}/status', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/status', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics/{metric_id}/status', tags=["customMetrics"])
def update_custom_metric_state(projectId: int, metric_id: int,
                               data: schemas.UpdateCustomMetricsStatusSchema = Body(...),
                               context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": custom_metrics.change_state(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                            status=data.active)}


@app.delete('/{projectId}/cards/{metric_id}', tags=["dashboard"])
@app.delete('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.delete('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def delete_custom_metric(projectId: int, metric_id: int, _=Body(None),
                         context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.delete(project_id=projectId, user_id=context.user_id, metric_id=metric_id)}
