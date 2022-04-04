import React from 'react';

interface Props {
    metric: any;
}
function WidgetChart(props: Props) {
    const { metric } = props;
    const renderChart = () => {
        const { metricType } = metric;
        if (metricType === 'timeseries') {
            return <div>Chart</div>;
        }

        if (metricType === 'table') {
            return <div>Table</div>;
        }

        return <div>Unknown</div>;
    }
    return (
        <div>
            {renderChart()}
        </div>
    );
}

export default WidgetChart;