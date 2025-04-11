import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import WidgetDateRange from 'Components/Dashboard/components/WidgetDateRange/WidgetDateRange';
import { useStore } from 'App/mstore';
import { FUNNEL, TIMESERIES } from 'App/constants/card';

import WidgetOptions from 'Components/Dashboard/components/WidgetOptions';
import WidgetWrapper from '../WidgetWrapper';

interface Props {
  className?: string;
  name: string;
  isEditing?: boolean;
}

function WidgetPreview(props: Props) {
  const { className = '' } = props;
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  const hasGranularSettings = [TIMESERIES, FUNNEL].includes(metric.metricType);
  const hasGranularity = ['lineChart', 'barChart', 'areaChart'].includes(
    metric.viewType,
  );
  const hasComparison =
    metric.metricType === FUNNEL ||
    ['lineChart', 'barChart', 'table', 'progressChart', 'metric'].includes(
      metric.viewType,
    );
  // [rangeStart, rangeEnd] or [period_name] -- have to check options
  const presetComparison = metric.compareTo;
  return (
    <div className={cn(className, 'bg-white rounded-xl border shadow-sm mt-0')}>
      <div className="flex items-center gap-2 px-4 py-2 border-b justify-between flex-wrap">
        <WidgetDateRange
          label=""
          hasGranularSettings={hasGranularSettings}
          hasGranularity={hasGranularity}
          hasComparison={hasComparison}
          presetComparison={presetComparison}
        />
        <WidgetOptions />
      </div>
      <div className="py-4">
        <WidgetWrapper widget={metric} isPreview isWidget={false} hideName />
      </div>
    </div>
  );
}

export default observer(WidgetPreview);
