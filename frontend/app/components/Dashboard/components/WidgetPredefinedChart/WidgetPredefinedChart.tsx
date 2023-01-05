import React from 'react';
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
import { FilterKey } from 'Types/filter/filterType';

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
            case FilterKey.ERRORS_PER_TYPE:
                return <ErrorsByType data={data} metric={metric} />
            case FilterKey.ERRORS_PER_DOMAINS:
                return <ErrorsPerDomain data={data} metric={metric} />
            case FilterKey.RESOURCES_BY_PARTY:
                return <ErrorsByOrigin data={data} metric={metric} />
            case FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS:
                return <SessionsAffectedByJSErrors data={data} metric={metric} />
            case FilterKey.DOMAINS_ERRORS_4XX:
                return <CallsErrors4xx data={data} metric={metric} />
            case FilterKey.DOMAINS_ERRORS_5XX:
                return <CallsErrors5xx data={data} metric={metric} />
            case FilterKey.CALLS_ERRORS:
                return <CallWithErrors isTemplate={isTemplate} data={data} metric={metric} />

            // PERFORMANCE
            case FilterKey.IMPACTED_SESSIONS_BY_SLOW_PAGES:
                return <SessionsImpactedBySlowRequests data={data} metric={metric} />
            case FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION:
                return <ResponseTimeDistribution data={data} metric={metric} />
            case FilterKey.SPEED_LOCATION:
                return <SpeedIndexByLocation metric={metric} />
            case FilterKey.CPU:
                return <CPULoad data={data} metric={metric} />
            case FilterKey.CRASHES:
                return <Crashes data={data} metric={metric} />
            case FilterKey.PAGES_DOM_BUILD_TIME:
                return <DomBuildingTime data={data} metric={metric} />
            case FilterKey.FPS:
                return <FPS data={data} metric={metric} />
            case FilterKey.MEMORY_CONSUMPTION:
                return <MemoryConsumption data={data} metric={metric} />
            case FilterKey.PAGES_RESPONSE_TIME:
                return <ResponseTime data={data} metric={metric} />
            case FilterKey.RESOURCES_VS_VISUALLY_COMPLETE:
                return <ResourceLoadedVsVisuallyComplete data={data} metric={metric} />
            case FilterKey.SESSIONS_PER_BROWSER:
                return <SessionsPerBrowser data={data} metric={metric} />
            case FilterKey.SLOWEST_DOMAINS:
                return <SlowestDomains data={data} metric={metric} />
            case FilterKey.TIME_TO_RENDER:
                return <TimeToRender data={data} metric={metric} />

            // Resources
            case FilterKey.BREAKDOWN_OF_LOADED_RESOURCES:
                return <BreakdownOfLoadedResources data={data} metric={metric} />
            case FilterKey.MISSING_RESOURCES:
                return <MissingResources isTemplate={isTemplate} data={data} metric={metric} />
            case FilterKey.RESOURCE_TYPE_VS_RESPONSE_END:
                return <ResourceLoadedVsResponseEnd data={data} metric={metric} />
            case FilterKey.RESOURCES_LOADING_TIME:
                return <ResourceLoadingTime data={data} metric={metric} />
            case FilterKey.SLOWEST_RESOURCES:
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
