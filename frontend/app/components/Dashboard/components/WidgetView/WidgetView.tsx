import React, { useState } from 'react';
import { useStore } from 'App/mstore';
import cn from 'classnames'
import { Icon, Loader } from 'UI';
import WidgetForm from '../WidgetForm';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';
import { useObserver } from 'mobx-react-lite';
import WidgetName from '../WidgetName';
import { withSiteId } from 'App/routes';
import FunnelIssues from '../Funnels/FunnelIssues/FunnelIssues';
import Breadcrumb from 'Shared/Breadcrumb';
import { FilterKey } from 'Types/filter/filterType';

interface Props {
    history: any;
    match: any
    siteId: any
}
function WidgetView(props: Props) {
    const { match: { params: { siteId, dashboardId, metricId } } } = props;
    const { metricStore, dashboardStore } = useStore();
    const widget = useObserver(() => metricStore.instance);
    const loading = useObserver(() => metricStore.isLoading);
    const [expanded, setExpanded] = useState(!metricId || metricId === 'create');
    
    const dashboards = useObserver(() => dashboardStore.dashboards);
    const dashboard = useObserver(() => dashboards.find((d: any) => d.dashboardId == dashboardId));
    const dashboardName = dashboard ? dashboard.name : null;


    React.useEffect(() => {
        if (metricId && metricId !== 'create') {
            metricStore.fetch(metricId, dashboardStore.period);
        } else if (metricId === 'create') {
            metricStore.init();
        }
    }, [])

    const onBackHandler = () => {
        props.history.goBack();
    }

    const openEdit = () => {
        if (expanded) return;
        setExpanded(true)
    }

    return useObserver(() => (
        <Loader loading={loading}>
            <div className="relative pb-10">
                <Breadcrumb
                    items={[
                        { label: dashboardName ? dashboardName : 'Metrics', to: dashboardId ? withSiteId('/dashboard/' + dashboardId, siteId) : withSiteId('/metrics', siteId) },
                        { label: widget.name, }
                    ]}
                />
                <div className="bg-white rounded border">
                    <div
                        className={cn(
                            "px-6 py-4 flex justify-between items-center",
                            {
                                'cursor-pointer hover:bg-active-blue hover:shadow-border-blue rounded': !expanded,
                            }
                        )}
                        onClick={openEdit}
                    >
                        <h1 className="mb-0 text-2xl">
                            <WidgetName
                                name={widget.name}
                                onUpdate={(name) => metricStore.merge({ name })}
                                canEdit={expanded}
                            />
                        </h1>
                        <div className="text-gray-600">
                            <div
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center cursor-pointer select-none"
                            >
                                <span className="mr-2 color-teal">{expanded ? 'Close' : 'Edit'}</span>
                                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="16" color="teal" />
                            </div>
                        </div>
                    </div>

                    { expanded && <WidgetForm onDelete={onBackHandler} {...props}/>}
                </div>

                <WidgetPreview  className="mt-8" />
                { widget.metricOf !== FilterKey.SESSIONS && widget.metricOf !== FilterKey.ERRORS && (
                    <>
                        { (widget.metricType === 'table' || widget.metricType === 'timeseries') && <WidgetSessions className="mt-8" /> }
                        { widget.metricType === 'funnel' && <FunnelIssues /> }
                    </>
                )}
            </div>
        </Loader>
    ));
}

export default WidgetView;
