import React from 'react';
import { useDashboardStore } from '../store/store';
import cn from 'classnames';
import { ItemMenu } from 'UI';

function WidgetWrapper(props) {
    const { widget } = props;
    const store: any = useDashboardStore();
    const dashboard = store.selectedDashboard;
    const siteId = store.siteId;
    
    return (
        <div className={cn("border rounded bg-white", 'col-span-' + widget.colSpan)} style={{ userSelect: 'none'}}>
            {/* <Link to={withSiteId(dashboardMetricDetails(dashboard.dashboardId, widget.widgetId), siteId)}> */}
                <div className="p-3 cursor-pointe border-b flex items-center justify-between">
                    {widget.name} - {widget.position}
                    <div>
                        <ItemMenu
                            items={[
                                {
                                    text: 'Edit',
                                    onClick: () => {
                                        console.log('edit');
                                    }
                                },
                            ]}
                        />
                        {/* <button className="btn btn-sm btn-outline-primary" onClick={() => dashboard.removeWidget(widget.widgetId)}>
                            remove
                        </button> */}
                    </div>
                </div>

                <div className="h-40">

                </div>
            {/* </Link> */}
        </div>
    );
}

export default WidgetWrapper;