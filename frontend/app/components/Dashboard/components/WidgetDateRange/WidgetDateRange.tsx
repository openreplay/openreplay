import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import {useStore} from 'App/mstore';
import {useObserver} from 'mobx-react-lite';
import {Space} from "antd";

function WidgetDateRange({
                             label = 'Time Range',
                         }: any) {
    const {dashboardStore} = useStore();
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
        <Space>
            {label && <span className="mr-1 color-gray-medium">{label}</span>}
            <SelectDateRange
                period={period}
                onChange={onChangePeriod}
                right={true}
            />
        </Space>
    );
}

export default WidgetDateRange;
