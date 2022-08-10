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
import SessionsPerBrowser from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsPerBrowser';
import CallWithErrors from '../../Widgets/PredefinedWidgets/CallWithErrors';
import SpeedIndexByLocation from '../../Widgets/PredefinedWidgets/SpeedIndexByLocation';
import SlowestResources from '../../Widgets/PredefinedWidgets/SlowestResources';
import ResponseTimeDistribution from '../../Widgets/PredefinedWidgets/ResponseTimeDistribution';

interface Props {
    data: any;
    predefinedKey: string
    metric?: any;
    isTemplate?: boolean;
}
function WidgetPredefinedChart(props: Props) {
    const { data, predefinedKey, metric, isTemplate } = props;

    const renderWidget = () => {
        switch (predefinedKey) {
            // ERRORS
            case 'errors_per_type':
                return <ErrorsByType data={data} metric={metric} />
            case 'errors_per_domains':
                return <ErrorsPerDomain data={data} metric={metric} />
            case 'resources_by_party':
                return <ErrorsByOrigin data={data} metric={metric} />
            case 'impacted_sessions_by_js_errors':
                return <SessionsAffectedByJSErrors data={data} metric={metric} />
            case 'domains_errors_4xx':
                return <CallsErrors4xx data={data} metric={metric} />
            case 'domains_errors_5xx':
                return <CallsErrors5xx data={data} metric={metric} />
            case 'calls_errors':
                return <CallWithErrors isTemplate={isTemplate} data={data} metric={metric} />

            // PERFORMANCE
            case 'impacted_sessions_by_slow_pages':
                return <SessionsImpactedBySlowRequests data={data} metric={metric} />
            case 'pages_response_time_distribution':
                return <ResponseTimeDistribution data={data} metric={metric} />
            case 'speed_location':
                return <SpeedIndexByLocation metric={metric} />
            case 'cpu':
                return <CPULoad data={data} metric={metric} />
            case 'crashes':
                return <Crashes data={data} metric={metric} />
            case 'pages_dom_buildtime':
                return <DomBuildingTime data={data} metric={metric} />
            case 'fps':
                return <FPS data={data} metric={metric} />
            case 'memory_consumption':
                return <MemoryConsumption data={data} metric={metric} />
            case 'pages_response_time':
                return <ResponseTime data={data} metric={metric} />
            case 'resources_vs_visually_complete':
                return <ResourceLoadedVsVisuallyComplete data={data} metric={metric} />
            case 'sessions_per_browser':
                return <SessionsPerBrowser data={data} metric={metric} />
            case 'slowest_domains':
                return <SlowestDomains data={data} metric={metric} />
            case 'time_to_render':
                return <TimeToRender data={data} metric={metric} />

            // Resources
            case 'resources_count_by_type':
                return <BreakdownOfLoadedResources data={data} metric={metric} />
            case 'missing_resources':
                return <MissingResources isTemplate={isTemplate} data={data} metric={metric} />
            case 'resource_type_vs_response_end':
                return <ResourceLoadedVsResponseEnd data={data} metric={metric} />
            case 'resources_loading_time':
                return <ResourceLoadingTime data={data} metric={metric} />
            case 'slowest_resources':
                return <SlowestResources isTemplate={isTemplate} data={data} metric={metric} />

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
