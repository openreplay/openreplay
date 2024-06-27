import React from 'react';

import ExCard from './ExCard';
import AreaChartCard from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/AreaChartCard";
import CustomMetricLineChart from "Components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricLineChart";
import {Styles} from "Components/Dashboard/Widgets/common";

interface Props {
    title: string;
    type: string;
    onCard: (card: string) => void;
    onClick?: any;
    data?: any,
}

function ExampleTrend(props: Props) {
    return (
        <ExCard
            {...props}
            title={
                <div className={'flex items-center gap-2'}>
                    <div>{props.title}</div>
                </div>
            }
        >
            {/*<AreaChartCard data={props.data} label={props.data?.label}/>*/}
            <CustomMetricLineChart
                data={props.data}
                colors={Styles.customMetricColors}
                params={{
                    density: 21,
                }}
                yaxis={
                    {...Styles.yaxis, domain: [0, 100]}
                }
                label={props.data?.label}
                onClick={props.onClick}
            />
        </ExCard>
    );
}

export default ExampleTrend;
