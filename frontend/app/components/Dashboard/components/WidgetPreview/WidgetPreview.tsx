import React from 'react';
import cn from 'classnames';
import WidgetWrapper from '../WidgetWrapper';
import { useStore } from 'App/mstore';
import { SegmentSelection, Button, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { FilterKey } from 'Types/filter/filterType';
import WidgetDateRange from '../WidgetDateRange/WidgetDateRange';
import ClickMapRagePicker from "Components/Dashboard/components/ClickMapRagePicker";
import DashboardSelectionModal from '../DashboardSelectionModal/DashboardSelectionModal';
import { CLICKMAP, TABLE, TIMESERIES, RETENTION, USER_PATH } from 'App/constants/card';
import { Space, Switch } from 'antd';

interface Props {
    className?: string;
    name: string;
    isEditing?: boolean;
}
function WidgetPreview(props: Props) {
    const [showDashboardSelectionModal, setShowDashboardSelectionModal] = React.useState(false);
    const { className = '' } = props;
    const { metricStore, dashboardStore } = useStore();
    const dashboards = dashboardStore.dashboards;
    const metric: any = metricStore.instance;
    const isTimeSeries = metric.metricType === TIMESERIES;
    const isTable = metric.metricType === TABLE;
    const isRetention = metric.metricType === RETENTION;
    const disableVisualization = metric.metricOf === FilterKey.SESSIONS || metric.metricOf === FilterKey.ERRORS;

    const changeViewType = (_, { name, value }: any) => {
        metric.update({ [ name ]: value });
    }

    const canAddToDashboard = metric.exists() && dashboards.length > 0;

    return (
        <>
        <div className={cn(className, 'bg-white rounded border')}>
            <div className="flex items-center justify-between px-4 pt-2">
                <h2 className="text-2xl">
                    {props.name}
                </h2>
                <div className="flex items-center">
                    {metric.metricType === USER_PATH && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            metric.update({ hideExcess: !metric.hideExcess });
                          }}
                        >
                          <Space>
                            <Switch
                              checked={metric.hideExcess}
                              size="small"
                            />
                            <span className="mr-4 color-gray-medium">Hide Minor Paths</span>
                          </Space>
                        </a>
                    )}
                    {isTimeSeries && (
                        <>
                            <span className="mr-4 color-gray-medium">Visualization</span>
                            <SegmentSelection
                                name="viewType"
                                className="my-3"
                                primary
                                size="small"
                                onSelect={ changeViewType }
                                value={{ value: metric.viewType }}
                                list={ [
                                    { value: 'lineChart', name: 'Chart', icon: 'graph-up-arrow' },
                                    { value: 'progress', name: 'Progress', icon: 'hash' },
                                ]}
                            />
                        </>
                    )}

                    {!disableVisualization && isTable && (
                        <>
                            <span className="mr-4 color-gray-medium">Visualization</span>
                            <SegmentSelection
                                name="viewType"
                                className="my-3"
                                primary={true}
                                size="small"
                                onSelect={ changeViewType }
                                value={{ value: metric.viewType }}
                                list={[
                                    { value: 'table', name: 'Table', icon: 'table' },
                                    { value: 'pieChart', name: 'Chart', icon: 'pie-chart-fill' },
                                ]}
                                disabledMessage="Chart view is not supported"
                            />
                        </>
                    )}

                    {isRetention && (
                        <>
                        <span className="mr-4 color-gray-medium">Visualization</span>
                        <SegmentSelection
                            name="viewType"
                            className="my-3"
                            primary={true}
                            size="small"
                            onSelect={ changeViewType }
                            value={{ value: metric.viewType }}
                            list={[
                                { value: 'trend', name: 'Trend', icon: 'graph-up-arrow' },
                                { value: 'cohort', name: 'Cohort', icon: 'dice-3' },
                            ]}
                            disabledMessage="Chart view is not supported"
                        />
                    </>
                    )}
                    <div className="mx-4" />
                    {metric.metricType === CLICKMAP ? (
                        <ClickMapRagePicker />
                    ) : null}
                    <WidgetDateRange />
                    {/* add to dashboard */}
                    {metric.exists() && (
                        <Button
                        variant="text-primary"
                        className="ml-2 p-0"
                        onClick={() => setShowDashboardSelectionModal(true)}
                        disabled={!canAddToDashboard}
                    >
                        <Icon name="columns-gap-filled" size="14" className="mr-2" color="teal"/>
                        Add to Dashboard
                    </Button>
                    )}
                </div>
            </div>
            <div className="p-4 pt-0">
                <WidgetWrapper widget={metric} isPreview={true} isWidget={false} hideName />
            </div>
        </div>
        { canAddToDashboard && (
            <DashboardSelectionModal
                metricId={metric.metricId}
                show={showDashboardSelectionModal}
                closeHandler={() => setShowDashboardSelectionModal(false)}
            />
        )}
        </>
    );
}

export default observer(WidgetPreview);
