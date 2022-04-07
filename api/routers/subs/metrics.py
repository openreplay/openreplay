from fastapi import Body, Depends

import schemas
from chalicelib.core import dashboards2, custom_metrics
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.post('/{projectId}/dashboards', tags=["dashboard"])
@app.put('/{projectId}/dashboards', tags=["dashboard"])
def create_dashboards(projectId: int, data: schemas.CreateDashboardSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards2.create_dashboard(project_id=projectId, user_id=context.user_id, data=data)


@app.get('/{projectId}/dashboards', tags=["dashboard"])
def get_dashboards(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.get_dashboards(project_id=projectId, user_id=context.user_id)}


@app.get('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def get_dashboard(projectId: int, dashboardId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = dashboards2.get_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)
    if data is None:
        return {"errors": ["dashboard not found"]}
    return {"data": data}


@app.post('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def update_dashboard(projectId: int, dashboardId: int, data: schemas.EditDashboardSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.update_dashboard(project_id=projectId, user_id=context.user_id,
                                                 dashboard_id=dashboardId, data=data)}


@app.delete('/{projectId}/dashboards/{dashboardId}', tags=["dashboard"])
def delete_dashboard(projectId: int, dashboardId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards2.delete_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)


@app.get('/{projectId}/dashboards/{dashboardId}/pin', tags=["dashboard"])
def pin_dashboard(projectId: int, dashboardId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.pin_dashboard(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId)}


@app.post('/{projectId}/dashboards/{dashboardId}/widgets', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}/widgets', tags=["dashboard"])
def add_widget_to_dashboard(projectId: int, dashboardId: int,
                            data: schemas.AddWidgetToDashboardPayloadSchema = Body(...),
                            context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.add_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                           data=data)}


@app.post('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}/metrics', tags=["dashboard"])
def create_metric_and_add_to_dashboard(projectId: int, dashboardId: int,
                                       data: schemas.CreateCustomMetricsSchema = Body(...),
                                       context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.create_metric_add_widget(project_id=projectId, user_id=context.user_id,
                                                         dashboard_id=dashboardId, data=data)}


@app.post('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
@app.put('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
def update_widget_in_dashboard(projectId: int, dashboardId: int, widgetId: int,
                               data: schemas.UpdateWidgetPayloadSchema = Body(...),
                               context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards2.update_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                     widget_id=widgetId, data=data)


@app.delete('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}', tags=["dashboard"])
def remove_widget_from_dashboard(projectId: int, dashboardId: int, widgetId: int,
                                 context: schemas.CurrentContext = Depends(OR_context)):
    return dashboards2.remove_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                     widget_id=widgetId)


@app.post('/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}/chart', tags=["dashboard"])
def get_widget_chart(projectId: int, dashboardId: int, widgetId: int,
                     data: schemas.CustomMetricChartPayloadSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    data = dashboards2.make_chart_widget(project_id=projectId, user_id=context.user_id, dashboard_id=dashboardId,
                                         widget_id=widgetId, data=data)
    if data is None:
        return {"errors": ["widget not found"]}
    return {"data": data}


@app.get('/{projectId}/metrics/templates', tags=["dashboard"])
def get_templates(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": dashboards2.get_templates(project_id=projectId, user_id=context.user_id)}


@app.post('/{projectId}/metrics/try', tags=["dashboard"])
@app.put('/{projectId}/metrics/try', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/try', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics/try', tags=["customMetrics"])
def try_custom_metric(projectId: int, data: schemas.TryCustomMetricsPayloadSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.merged_live(project_id=projectId, data=data)}


@app.post('/{projectId}/metrics', tags=["dashboard"])
@app.put('/{projectId}/metrics', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics', tags=["customMetrics"])
def add_custom_metric(projectId: int, data: schemas.CreateCustomMetricsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return custom_metrics.create(project_id=projectId, user_id=context.user_id, data=data)


@app.get('/{projectId}/metrics', tags=["dashboard"])
@app.get('/{projectId}/custom_metrics', tags=["customMetrics"])
def get_custom_metrics(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.get_all(project_id=projectId, user_id=context.user_id)}


@app.get('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.get('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def get_custom_metric(projectId: int, metric_id: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get(project_id=projectId, user_id=context.user_id, metric_id=metric_id)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/metrics/{metric_id}/sessions', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/sessions', tags=["customMetrics"])
def get_custom_metric_sessions(projectId: int, metric_id: int,
                               data: schemas.CustomMetricSessionsPayloadSchema = Body(...),
                               context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.get_sessions(project_id=projectId, user_id=context.user_id, metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/metrics/{metric_id}/chart', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}/chart', tags=["customMetrics"])
def get_custom_metric_chart(projectId: int, metric_id: int, data: schemas.CustomMetricChartPayloadSchema = Body(...),
                            context: schemas.CurrentContext = Depends(OR_context)):
    data = dashboards2.make_chart_metrics(project_id=projectId, user_id=context.user_id, metric_id=metric_id,
                                          data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


@app.post('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.put('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.post('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
@app.put('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def update_custom_metric(projectId: int, metric_id: int, data: schemas.UpdateCustomMetricsSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    data = custom_metrics.update(project_id=projectId, user_id=context.user_id, metric_id=metric_id, data=data)
    if data is None:
        return {"errors": ["custom metric not found"]}
    return {"data": data}


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


@app.delete('/{projectId}/metrics/{metric_id}', tags=["dashboard"])
@app.delete('/{projectId}/custom_metrics/{metric_id}', tags=["customMetrics"])
def delete_custom_metric(projectId: int, metric_id: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": custom_metrics.delete(project_id=projectId, user_id=context.user_id, metric_id=metric_id)}
