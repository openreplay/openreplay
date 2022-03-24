import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';
import { useDashboardStore } from '../../store/store';
import WidgetForm from '../WidgetForm';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';
import { Icon } from 'UI';

interface Props {

}
function WidgetView(props: Props) {
    const [expanded, setExpanded] = useState(true);
    const store: any = useDashboardStore();
    const widget = store.currentWidget;
    return (
        <div className="page-margin container-70 mb-8">
            <div className="bg-white rounded border">
                <div className="p-4 flex justify-between items-center">
                    <h1 className="mb-0 text-2xl">{widget.name}</h1>
                    <div className="text-gray-600">
                        <div
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center cursor-pointer select-none"
                        >
                            <span className="mr-2 color-teal">{expanded ? 'Collapse' : 'Expand'}</span>
                            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="16" color="teal" />
                        </div>
                    </div>
                </div>

                { expanded && <WidgetForm />}
            </div>

            <WidgetPreview  className="mt-8" />
            <WidgetSessions className="mt-8" />
        </div>
    );
}

export default withRouter(WidgetView);