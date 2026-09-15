import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CallsErrors4xx from 'App/components/Dashboard/Widgets/PredefinedWidgets/CallsErrors4xx';
import CallsErrors5xx from 'App/components/Dashboard/Widgets/PredefinedWidgets/CallsErrors5xx';
import ErrorsByOrigin from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByOrigin';
import ErrorsByType from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsByType';
import ErrorsPerDomain from 'App/components/Dashboard/Widgets/PredefinedWidgets/ErrorsPerDomain';
import SessionsAffectedByJSErrors from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsAffectedByJSErrors';
import SessionsPerBrowser from 'App/components/Dashboard/Widgets/PredefinedWidgets/SessionsPerBrowser';
import SlowestDomains from 'App/components/Dashboard/Widgets/PredefinedWidgets/SlowestDomains';

import CallWithErrors from '../../Widgets/PredefinedWidgets/CallWithErrors';

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
      default:
        return (
          <div className="h-40 color-red">{t('Widget not supported')}</div>
        );
    }
  };

  return <>{renderWidget()}</>;
}

export default observer(WidgetPredefinedChart);
