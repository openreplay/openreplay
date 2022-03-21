import React from 'react';
import { withRouter } from 'react-router-dom';
import { useDashboardStore } from '../store/store';

function WidgetView(props) {
    console.log('WidgetView', props);
    const store: any = useDashboardStore();
    const widget = store.currentWidget;
    return (
        <div>
            <div className="bg-white rounded border">
                <div className="p-3">
                    <h1 className="mb-0 text-2xl">{widget.name}</h1>
                </div>
            </div>
        </div>
    );
}

export default withRouter(WidgetView);