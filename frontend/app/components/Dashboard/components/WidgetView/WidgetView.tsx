import React, {useState} from 'react';
import {useStore} from 'App/mstore';
import {Icon, Loader, NoContent} from 'UI';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';
import {useObserver} from 'mobx-react-lite';
import {dashboardMetricDetails, metricDetails, withSiteId} from 'App/routes';
import FunnelIssues from '../Funnels/FunnelIssues/FunnelIssues';
import Breadcrumb from 'Shared/Breadcrumb';
import {FilterKey} from 'Types/filter/filterType';
import {Prompt, useHistory} from 'react-router';
import AnimatedSVG, {ICONS} from 'Shared/AnimatedSVG/AnimatedSVG';
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
import WidgetViewHeader from "Components/Dashboard/components/WidgetView/WidgetViewHeader";
import WidgetFormNew from "Components/Dashboard/components/WidgetForm/WidgetFormNew";
import {Space} from "antd";
import {renderClickmapThumbnail} from "Components/Dashboard/components/WidgetForm/renderMap";
import Widget from "App/mstore/types/widget";

interface Props {
    history: any;
    match: any;
    siteId: any;
}

function WidgetView(props: Props) {
    const {
        match: {
            params: {siteId, dashboardId, metricId},
        },
    } = props;
    // const siteId = location.pathname.split('/')[1];
    // const dashboardId = location.pathname.split('/')[3];
    const {metricStore, dashboardStore} = useStore();
    const widget = useObserver(() => metricStore.instance);
    const loading = useObserver(() => metricStore.isLoading);
    const [expanded, setExpanded] = useState(!metricId || metricId === 'create');
    const hasChanged = useObserver(() => widget.hasChanged);
    const dashboards = useObserver(() => dashboardStore.dashboards);
    const dashboard = useObserver(() => dashboards.find((d: any) => d.dashboardId == dashboardId));
    const dashboardName = dashboard ? dashboard.name : null;
    const [metricNotFound, setMetricNotFound] = useState(false);
    const history = useHistory();
    const [initialInstance, setInitialInstance] = useState();
    const isClickMap = widget.metricType === CLICKMAP;

    React.useEffect(() => {
        if (metricId && metricId !== 'create') {
            metricStore.fetch(metricId, dashboardStore.period).catch((e) => {
                if (e.response.status === 404 || e.response.status === 422) {
                    setMetricNotFound(true);
                }
            });
        } else {
            metricStore.init();
        }
    }, []);

    // const onBackHandler = () => {
    //     props.history.goBack();
    // };
    //
    // const openEdit = () => {
    //     if (expanded) return;
    //     setExpanded(true);
    // };

    const undoChanges = () => {
        const w = new Widget();
        metricStore.merge(w.fromJson(initialInstance), false);
    };

    const onSave = async () => {
        const wasCreating = !widget.exists();
        if (isClickMap) {
            try {
                widget.thumbnail = await renderClickmapThumbnail();
            } catch (e) {
                console.error(e);
            }
        }
        const savedMetric = await metricStore.save(widget);
        setInitialInstance(widget.toJson());
        if (wasCreating) {
            if (parseInt(dashboardId, 10) > 0) {
                history.replace(
                    withSiteId(dashboardMetricDetails(dashboardId, savedMetric.metricId), siteId)
                );
                void dashboardStore.addWidgetToDashboard(
                    dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
                    [savedMetric.metricId]
                );
            } else {
                history.replace(withSiteId(metricDetails(savedMetric.metricId), siteId));
            }
        }
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

            <div style={{maxWidth: '1360px', margin: 'auto'}}>
                <Breadcrumb
                    items={[
                        {
                            label: dashboardName ? dashboardName : 'Cards',
                            to: dashboardId ? withSiteId('/dashboard/' + dashboardId, siteId) : withSiteId('/metrics', siteId),
                        },
                        {label: widget.name},
                    ]}
                />
                <NoContent
                    show={metricNotFound}
                    title={
                        <div className="flex flex-col items-center justify-between">
                            <AnimatedSVG name={ICONS.EMPTY_STATE} size={100}/>
                            <div className="mt-4">Metric not found!</div>
                        </div>
                    }
                >
                    <div className="w-full">
                        <div className='my-3'>
                            <WidgetViewHeader onSave={onSave} undoChanges={undoChanges}/>
                        </div>

                        <div className='my-3'>
                            <WidgetFormNew/>
                        </div>

                        {/*<div className="bg-white rounded border mt-3">*/}
                        {/*    <WidgetForm expanded={expanded} onDelete={onBackHandler} {...props} />*/}
                        {/*</div>*/}

                        <div className='my-3'>
                            <WidgetPreview name={widget.name} isEditing={expanded}/>

                            {widget.metricOf !== FilterKey.SESSIONS && widget.metricOf !== FilterKey.ERRORS && (
                                <>
                                    {(widget.metricType === TABLE || widget.metricType === TIMESERIES || widget.metricType === CLICKMAP || widget.metricType === INSIGHTS) &&
                                        <WidgetSessions/>}
                                    {widget.metricType === FUNNEL && <FunnelIssues/>}
                                </>
                            )}

                            {widget.metricType === USER_PATH && <CardIssues/>}
                            {widget.metricType === RETENTION && <CardUserList/>}
                        </div>
                    </div>
                </NoContent>
            </div>
        </Loader>
    ));
}

export default WidgetView;
