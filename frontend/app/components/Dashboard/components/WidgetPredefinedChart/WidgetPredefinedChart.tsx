import React from 'react';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import CustomMetricOverviewChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import ErrorsByType from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByType';
import ErrorsByOrigin from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByOrigin';
import ErrorsPerDomain from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsPerDomain';
import { useObserver } from 'mobx-react-lite';
import SessionsAffectedByJSErrors from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsAffectedByJSErrors';
import CallsErrors4xx from 'App/components/Dashboard/Widgets/PredefinedWidgets/CallsErrors4xx';
import CallsErrors5xx from 'App/components/Dashboard/Widgets/PredefinedWidgets/CallsErrors5xx';
import CPULoad from 'App/components/Dashboard/Widgets/PredefinedWidgets/CPULoad';
import Crashes from 'App/components/Dashboard/Widgets/PredefinedWidgets/Crashes';
import DomBuildingTime from 'App/components/Dashboard/Widgets/PredefinedWidgets/DomBuildingTime';
import FPS from 'App/components/Dashboard/Widgets/PredefinedWidgets/FPS';
import MemoryConsumption from 'App/components/Dashboard/Widgets/PredefinedWidgets/MemoryConsumption';
import ResponseTime from 'App/components/Dashboard/Widgets/PredefinedWidgets/ResponseTime';
import TimeToRender from 'App/components/Dashboard/Widgets/PredefinedWidgets/TimeToRender';
import SlowestDomains from 'App/components/Dashboard/Widgets/PredefinedWidgets/SlowestDomains';
import ResourceLoadedVsVisuallyComplete from 'App/components/Dashboard/Widgets/PredefinedWidgets/ResourceLoadedVsVisuallyComplete';
import SessionsImpactedBySlowRequests from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsImpactedBySlowRequests';
import ResourceLoadingTime from 'App/components/Dashboard/Widgets/PredefinedWidgets/ResourceLoadingTime';
import BreakdownOfLoadedResources from 'App/components/Dashboard/Widgets/PredefinedWidgets/BreakdownOfLoadedResources';
import MissingResources from 'App/components/Dashboard/Widgets/PredefinedWidgets/MissingResources';
import ResourceLoadedVsResponseEnd from 'App/components/Dashboard/Widgets/PredefinedWidgets/ResourceLoadedVsResponseEnd';

interface Props {
    data: any;
    predefinedKey: string
}
function WidgetPredefinedChart(props: Props) {
    const { data, predefinedKey } = props;

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
            // case 'impacted_sessions_by_slow_pages':
            // case 'pages_response_time_distribution':
            // case 'speed_location':
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
            case 'resources_vs_visually_complete':
                return <ResourceLoadedVsVisuallyComplete data={data} />
            case 'sessions_per_browser':
                return <SessionsImpactedBySlowRequests data={data} />
            case 'slowest_domains':
                return <SlowestDomains data={data} />
            case 'time_to_render':
                return <TimeToRender data={data} />

            // Resources
            case 'resources_count_by_type':
                return <BreakdownOfLoadedResources data={data} />
            case 'missing_resources':
                return <MissingResources data={data} />
            case 'resource_type_vs_response_end':
                return <ResourceLoadedVsResponseEnd data={data} />
            case 'resources_loading_time':
                return <ResourceLoadingTime data={data} />
            // case 'slowest_resources':

            default:
                return <div className="h-40 color-red">Widget not supported</div>
        }
    }    

    return useObserver(() => (
        <>
            {renderWidget()}
        </>
    ));
}

export default WidgetPredefinedChart;