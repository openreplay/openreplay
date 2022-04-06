import React from 'react';
import cn from 'classnames';
import WidgetWrapper from '../WidgetWrapper';
import { useStore } from 'App/mstore';
import { Loader, NoContent, SegmentSelection, Icon } from 'UI';
import DateRange from 'Shared/DateRange';
import { useObserver } from 'mobx-react-lite';

interface Props {
    className?: string;
}
function WidgetPreview(props: Props) {
    const { className = '' } = props;
    const { metricStore } = useStore();
    const metric: any = useObserver(() => metricStore.instance);
    const isTimeSeries = metric.metricType === 'timeseries';
    const isTable = metric.metricType === 'table';

    const chagneViewType = (e, { name, value }) => {
        metric.update({ [ name ]: value });
    }

    const onDateChange = (changedDates) => {
        // setPeriod({  ...changedDates, rangeName: changedDates.rangeValue })
        metric.update({  ...changedDates, rangeName: changedDates.rangeValue });
    }

    console.log('view', metric.viewType)

    return useObserver(() => (
        <div className={cn(className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl">Trend</h2>
                <div className="flex items-center">
                    {isTimeSeries && (
                        <>
                            <span className="color-gray-medium mr-2">Visualization</span>
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
                            <span className="mr-1 color-gray-medium">Visualization</span>
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
                            />
                        </>
                    )}
                    <div className="mx-4" />
                        <span className="mr-1 color-gray-medium">Time Range</span>
                        <DateRange
                            rangeValue={metric.rangeName}
                            startDate={metric.startDate}
                            endDate={metric.endDate}
                            onDateChange={onDateChange}
                            customRangeRight
                            direction="left"
                        />
                    </div>
            </div>
            <div className="bg-white rounded p-4">
                <WidgetWrapper widget={metric} isPreview={true} />
            </div>
        </div>
    ));
}

export default WidgetPreview;