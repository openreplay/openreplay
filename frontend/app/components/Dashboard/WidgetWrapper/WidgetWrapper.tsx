import React from 'react';
import { observer } from "mobx-react-lite";
import { useDashboardStore } from '../store/store';
import cn from 'classnames';
import { Link } from 'UI';
import { dashboardMetric, withSiteId } from 'App/routes';

function WidgetWrapper(props) {
    const { widget } = props;
    const store: any = useDashboardStore();
    const dashboard = store.selectedDashboard;
    const siteId = store.siteId;
    
    return (
        <div className={cn("border rounded", 'col-span-' + widget.colSpan)} style={{ userSelect: 'none'}}>
            <Link to={withSiteId(dashboardMetric(12, widget.widgetId), siteId)}>
                <div className="p-3 cursor-pointer bg-white border-b flex items-center justify-between">
                    {widget.name} - {widget.position}
                    <div>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => dashboard.removeWidget(widget.widgetId)}>
                            remove
                        </button>
                    </div>
                </div>

                <div className="bg-white h-40">

                </div>
            </Link>
        </div>
    );
}

export default observer(WidgetWrapper);