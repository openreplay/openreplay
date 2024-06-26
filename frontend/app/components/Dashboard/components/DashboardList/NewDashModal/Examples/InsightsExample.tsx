import React from 'react';
import CustomMetricOverviewChart from "Components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart";
import ExCard from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard";
import InsightsCard from "Components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard";

interface Props {
    title: string;
    type: string;
    onCard: (card: string) => void;
}

function InsightsExample(props: Props) {
    const data = [
        {
            "category": "errors",
            "name": "Error: Invalid unit value NaN",
            "value": 562,
            "oldValue": null,
            "ratio": 7.472410583698976,
            "change": null,
            "isNew": true
        },
        {
            "category": "errors",
            "name": "TypeError: e.node.getContext is not a function",
            "value": 128,
            "oldValue": 1,
            "ratio": 1.7019013429065284,
            "change": 12700.0,
            "isNew": false
        },
        {
            "category": "errors",
            "name": "Unhandled Promise Rejection: {\"message\":\"! POST error on /client/members; 400\",\"response\":{}}",
            "value": 26,
            "oldValue": null,
            "ratio": 0.34569871027788857,
            "change": null,
            "isNew": true
        }
    ];
    return (
        <ExCard
            {...props}
        >
            <InsightsCard data={data}/>
        </ExCard>
    );
}

export default InsightsExample;
