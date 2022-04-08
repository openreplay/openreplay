import React from 'react';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import CustomMetricOverviewChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import ErrorsByType from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByType';
import ErrorsByOrigin from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByOrigin';
import ErrorsPerDomain from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsPerDomain';
import { useObserver } from 'mobx-react-lite';
import SessionsAffectedByJSErrors from '../../Widgets/PredefinedWidgets/SessionsAffectedByJSErrors';
import CallsErrors4xx from '../../Widgets/PredefinedWidgets/CallsErrors4xx';
import CallsErrors5xx from '../../Widgets/PredefinedWidgets/CallsErrors5xx';
import CPULoad from '../../Widgets/PredefinedWidgets/CPULoad';
import Crashes from '../../Widgets/PredefinedWidgets/Crashes';
import DomBuildingTime from '../../Widgets/PredefinedWidgets/DomBuildingTime';
import FPS from '../../Widgets/PredefinedWidgets/FPS';
import MemoryConsumption from '../../Widgets/PredefinedWidgets/MemoryConsumption';
import ResponseTime from '../../Widgets/PredefinedWidgets/ResponseTime';
import TimeToRender from '../../Widgets/PredefinedWidgets/TimeToRender';
import SlowestDomains from '../../Widgets/PredefinedWidgets/SlowestDomains';

interface Props {
    data: any;
    predefinedKey: string
}
function WidgetPredefinedChart(props: Props) {
    const { data, predefinedKey } = props;
    // const { viewType } = data;
    const params = { density: 70 } 

    const renderWidget = () => {
        switch (predefinedKey) {
            // ERRORS
            case 'errors_per_type':
                return <ErrorsByType data={data} />
            case 'errors_per_domains':
                return <ErrorsPerDomain data={data} />
            case 'resources_by_party':
                return <ErrorsByOrigin data={data} />
            case 'impacted_sessions_by_js_errors':
                return <SessionsAffectedByJSErrors data={data} />
            case 'domains_errors_4xx':
                return <CallsErrors4xx data={data} />
            case 'domains_errors_5xx':
                return <CallsErrors5xx data={data} />

            // PERFORMANCE
            case 'cpu':
                return <CPULoad data={data} />
            case 'crashes':
                return <Crashes data={data} />
            case 'pages_dom_buildtime':
                return <DomBuildingTime data={data} />
            case 'fps':
                return <FPS data={data} />
            case 'memory_consumption':
                return <MemoryConsumption data={data} />
            case 'pages_response_time':
                return <ResponseTime data={data} />
            // case 'pages_response_time_distribution':
            // case 'resources_vs_visually_complete':
            // case 'impacted_sessions_by_slow_pages':
            // case 'sessions_per_browser':
            case 'slowest_domains':
                return <SlowestDomains data={data} />
            // case 'speed_location':
            case 'time_to_render':
                return <TimeToRender data={data} />


            default:
                return <div>No widget found</div>
        }
    }    

    return useObserver(() => (
        <>
            {renderWidget()}
        </>
    ));
}

export default WidgetPredefinedChart;