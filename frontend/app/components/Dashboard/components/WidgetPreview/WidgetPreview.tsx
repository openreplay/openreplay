import React from 'react';
import cn from 'classnames';
import WidgetWrapper from '../WidgetWrapper';
import { useStore } from 'App/mstore';
import { SegmentSelection } from 'UI';
import { useObserver } from 'mobx-react-lite';
import SelectDateRange from 'Shared/SelectDateRange';
import { FilterKey } from 'Types/filter/filterType';
// import Period, { LAST_24_HOURS, LAST_30_DAYS } from 'Types/app/period';

interface Props {
    className?: string;
}
function WidgetPreview(props: Props) {
    const { className = '' } = props;
    const { metricStore, dashboardStore } = useStore();
    const metric: any = useObserver(() => metricStore.instance);
    const isTimeSeries = metric.metricType === 'timeseries';
    const isTable = metric.metricType === 'table';
    // const drillDownFilter = useObserver(() => dashboardStore.drillDownFilter);
    const disableVisualization = useObserver(() => metric.metricOf === FilterKey.SESSIONS || metric.metricOf === FilterKey.ERRORS);
    const period = useObserver(() => dashboardStore.drillDownPeriod);

    const chagneViewType = (e, { name, value }: any) => {
        metric.update({ [ name ]: value });
    }

    const onChangePeriod = (period: any) => {
        dashboardStore.setDrillDownPeriod(period);
    }

    return useObserver(() => (
        <div className={cn(className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl">Trend</h2>
                <div className="flex items-center">
                    {isTimeSeries && (
                        <>
                            <span className="mr-4 color-gray-medium">Visualization</span>
                            <SegmentSelection
                                name="viewType"
                                className="my-3"
                                primary
                                icons={true}
                                onSelect={ chagneViewType }
                                value={{ value: metric.viewType }}
                                list={ [
                                    { value: 'lineChart', name: 'Chart', icon: 'graph-up-arrow' },
                                    { value: 'progress', name: 'Progress', icon: 'hash' },
                                ]}
                            />
                        </>
                    )}

                    {isTable && (
                        <>
                            <span className="mr-4 color-gray-medium">Visualization</span>
                            <SegmentSelection
                                name="viewType"
                                className="my-3"
                                primary={true}
                                icons={true}
                                onSelect={ chagneViewType }
                                value={{ value: metric.viewType }}
                                list={[
                                    { value: 'table', name: 'Table', icon: 'table' },
                                    { value: 'pieChart', name: 'Chart', icon: 'pie-chart-fill' },
                                ]}
                                disabled={disableVisualization}
                                disabledMessage="Chart view is not supported"
                            />
                        </>
                    )}
                    <div className="mx-4" />
                        <span className="mr-1 color-gray-medium">Time Range</span>
                        <SelectDateRange
                            period={period}
                            // onChange={(period: any) => metric.setPeriod(period)}
                            onChange={onChangePeriod}
                            right={true}
                        />
                    </div>
            </div>
            <div className="bg-white rounded p-4">
                <WidgetWrapper widget={metric} isPreview={true} isWidget={false} />
            </div>
        </div>
    ));
}

export default WidgetPreview;