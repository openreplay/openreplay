import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props {

}
function WidgetDateRange(props: Props) {
    const { dashboardStore } = useStore();
    const period = useObserver(() => dashboardStore.drillDownPeriod);
    const drillDownFilter = useObserver(() => dashboardStore.drillDownFilter);

    const onChangePeriod = (period: any) => {
        dashboardStore.setDrillDownPeriod(period);
        const periodTimestamps = period.toTimestamps();
        drillDownFilter.merge({
            startTimestamp: periodTimestamps.startTimestamp,
            endTimestamp: periodTimestamps.endTimestamp,
        })
    }

    return (
        <>
            <span className="mr-1 color-gray-medium">Time Range</span>
            <SelectDateRange
                period={period}
                // onChange={(period: any) => metric.setPeriod(period)}
                onChange={onChangePeriod}
                right={true}
            />  
        </>
    );
}

export default WidgetDateRange;