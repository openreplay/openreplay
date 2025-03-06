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
import SessionsImpactedBySlowRequests from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsImpactedBySlowRequests';
import SessionsPerBrowser from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsPerBrowser';
import { FilterKey } from 'Types/filter/filterType';
import CallWithErrors from '../../Widgets/PredefinedWidgets/CallWithErrors';
import SpeedIndexByLocation from '../../Widgets/PredefinedWidgets/SpeedIndexByLocation';
import ResponseTimeDistribution from '../../Widgets/PredefinedWidgets/ResponseTimeDistribution';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  predefinedKey: string;
  metric?: any;
  isTemplate?: boolean;
}
function WidgetPredefinedChart(props: Props) {
  const { t } = useTranslation();
  const { data, predefinedKey, metric, isTemplate } = props;

  const renderWidget = () => {
    switch (predefinedKey) {
      // ERRORS
      case FilterKey.ERRORS_PER_TYPE:
        return <ErrorsByType data={data} metric={metric} />;
      case FilterKey.ERRORS_PER_DOMAINS:
        return <ErrorsPerDomain data={metric.data} />;
      case FilterKey.RESOURCES_BY_PARTY:
        return <ErrorsByOrigin data={data} metric={metric} />;
      case FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS:
        return <SessionsAffectedByJSErrors data={data} metric={metric} />;
      case FilterKey.DOMAINS_ERRORS_4XX:
        return <CallsErrors4xx data={data} metric={metric} />;
      case FilterKey.DOMAINS_ERRORS_5XX:
        return <CallsErrors5xx data={data} metric={metric} />;
      case FilterKey.CALLS_ERRORS:
        return <CallWithErrors isTemplate={isTemplate} data={data} />;
      case FilterKey.SPEED_LOCATION:
        return <SpeedIndexByLocation data={data} />;
      default:
        return (
          <div className="h-40 color-red">{t('Widget not supported')}</div>
        );
    }
  };

  return useObserver(() => <>{renderWidget()}</>);
}

export default WidgetPredefinedChart;
