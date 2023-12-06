import React, { useState } from 'react';
import { useStore } from 'App/mstore';
import cn from 'classnames';
import { Icon, Loader, NoContent } from 'UI';
import WidgetForm from '../WidgetForm';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';
import { useObserver } from 'mobx-react-lite';
import WidgetName from '../WidgetName';
import { withSiteId } from 'App/routes';
import FunnelIssues from '../Funnels/FunnelIssues/FunnelIssues';
import Breadcrumb from 'Shared/Breadcrumb';
import { FilterKey } from 'Types/filter/filterType';
import { Prompt } from 'react-router';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import {
    TIMESERIES,
    TABLE,
    CLICKMAP,
    FUNNEL,
    INSIGHTS,
    USER_PATH,
    RETENTION,
  } from 'App/constants/card';
import CardIssues from '../CardIssues';
import CardUserList from '../CardUserList/CardUserList';

interface Props {
    history: any;
    match: any;
    siteId: any;
}
function WidgetView(props: Props) {
    const {
        match: {
            params: { siteId, dashboardId, metricId },
        },
    } = props;
    const { metricStore, dashboardStore } = useStore();
    const widget = useObserver(() => metricStore.instance);
    const loading = useObserver(() => metricStore.isLoading);
    const [expanded, setExpanded] = useState(!metricId || metricId === 'create');
    const hasChanged = useObserver(() => widget.hasChanged);

    const dashboards = useObserver(() => dashboardStore.dashboards);
    const dashboard = useObserver(() => dashboards.find((d: any) => d.dashboardId == dashboardId));
    const dashboardName = dashboard ? dashboard.name : null;
    const [metricNotFound, setMetricNotFound] = useState(false);

    React.useEffect(() => {
        if (metricId && metricId !== 'create') {
            metricStore.fetch(metricId, dashboardStore.period).catch((e) => {
                if (e.status === 404 || e.status === 422) {
                    setMetricNotFound(true);
                }
            });
        } else {
            metricStore.init();
        }
    }, []);

    const onBackHandler = () => {
        props.history.goBack();
    };

    const openEdit = () => {
        if (expanded) return;
        setExpanded(true);
    };

    return useObserver(() => (
        <Loader loading={loading}>
            <Prompt
                when={hasChanged}
                message={(location: any) => {
                    if (location.pathname.includes('/metrics/') || location.pathname.includes('/metric/')) {
                        return true;
                    }
                    return 'You have unsaved changes. Are you sure you want to leave?';
                }}
            />

            <div style={{ maxWidth: '1360px', margin: 'auto'}}>
                <Breadcrumb
                    items={[
                        {
                            label: dashboardName ? dashboardName : 'Cards',
                            to: dashboardId ? withSiteId('/dashboard/' + dashboardId, siteId) : withSiteId('/metrics', siteId),
                        },
                        { label: widget.name },
                    ]}
                />
                <NoContent
                    show={metricNotFound}
                    title={
                        <div className="flex flex-col items-center justify-between">
                            <AnimatedSVG name={ICONS.EMPTY_STATE} size={100} />
                            <div className="mt-4">Metric not found!</div>
                        </div>
                    }
                >
                    <div className="bg-white rounded border">
                        <div
                            className={cn('px-6 py-4 flex justify-between items-center', {
                                'cursor-pointer hover:bg-active-blue hover:shadow-border-blue rounded': !expanded,
                            })}
                            onClick={openEdit}
                        >
                            <h1 className="mb-0 text-2xl mr-4 min-w-fit">
                                <WidgetName name={widget.name} onUpdate={(name) => metricStore.merge({ name })} canEdit={expanded} />
                            </h1>
                            <div className="text-gray-600 w-full cursor-pointer" onClick={() => setExpanded(!expanded)}>
                                <div className="flex items-center select-none w-fit ml-auto">
                                    <span className="mr-2 color-teal">{expanded ? 'Collapse' : 'Edit'}</span>
                                    <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="16" color="teal" />
                                </div>
                            </div>
                        </div>

                        {expanded && <WidgetForm onDelete={onBackHandler} {...props} />}
                    </div>

                    <WidgetPreview className="mt-8" name={widget.name} isEditing={expanded} />
                    
                    {widget.metricOf !== FilterKey.SESSIONS && widget.metricOf !== FilterKey.ERRORS && (
                        <>
                            {(widget.metricType === TABLE || widget.metricType === TIMESERIES || widget.metricType === CLICKMAP || widget.metricType === INSIGHTS) && <WidgetSessions className="mt-8" />}
                            {widget.metricType === FUNNEL && <FunnelIssues />}
                        </>
                    )}

                    {widget.metricType === USER_PATH && <CardIssues />}
                    {widget.metricType === RETENTION && <CardUserList />}
                </NoContent>
            </div>
        </Loader>
    ));
}

export default WidgetView;
