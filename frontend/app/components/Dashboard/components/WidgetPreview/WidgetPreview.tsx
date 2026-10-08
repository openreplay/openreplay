import { Loader } from '@/ui/feedback/Loader';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy } from 'react';

import { FUNNEL, TIMESERIES } from 'App/constants/card';
import { useStore } from 'App/mstore';
import WidgetDateRange from 'Components/Dashboard/components/WidgetDateRange/WidgetDateRange';
import WidgetOptions from 'Components/Dashboard/components/WidgetOptions';

const WidgetChart = lazy(
  () => import('Components/Dashboard/components/WidgetChart'),
);

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

  React.useEffect(() => {
    // otherwise data obj change won't be registered if you get data -> change page -> go back
    return () => metricStore.init();
  }, []);

  const presetComparison = metric.compareTo;
  return (
    <div className={cn(className, 'm-cardp__preview')}>
      <div className="m-cardp__toolbar">
        <div className="m-cardp__toolbar-left">
          <WidgetDateRange
            hasGranularSettings={hasGranularSettings}
            hasGranularity={hasGranularity}
            hasComparison={hasComparison}
            presetComparison={presetComparison}
          />
        </div>
        <div className="m-cardp__toolbar-right">
          <WidgetOptions />
        </div>
      </div>
      <div className="m-cardp__chart">
        <Suspense fallback={<Loader loading style={{ height: 240 }} />}>
          <WidgetChart isPreview metric={metric} />
        </Suspense>
      </div>
    </div>
  );
}

export default observer(WidgetPreview);
