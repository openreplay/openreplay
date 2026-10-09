import { IconButton } from '@/ui/actions/IconButton';
import { Loader } from '@/ui/feedback/Loader';
import { Tooltip } from '@/ui/overlays/tooltip';
import cn from 'classnames';
import { Download, Table2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

import { FUNNEL, TIMESERIES } from 'App/constants/card';
import { useStore } from 'App/mstore';
import WidgetDateRange from 'Components/Dashboard/components/WidgetDateRange/WidgetDateRange';
import WidgetOptions from 'Components/Dashboard/components/WidgetOptions';

import { type PreviewTable, PreviewTableContext } from './previewTable';

const WidgetChart = lazy(
  () => import('Components/Dashboard/components/WidgetChart'),
);

const TABLE_KEY = 'm-card-table';
const readTable = () => {
  try {
    return localStorage.getItem(TABLE_KEY) !== 'hidden';
  } catch {
    return true;
  }
};

interface Props {
  className?: string;
  name: string;
  isEditing?: boolean;
}

function WidgetPreview(props: Props) {
  const { className = '' } = props;
  const { t } = useTranslation();
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

  const [tableShown, setTableShown] = React.useState(readTable);
  const toggleTable = () =>
    setTableShown((v) => {
      try {
        localStorage.setItem(TABLE_KEY, v ? 'hidden' : 'shown');
      } catch {
        /* private mode: the choice lasts for the page */
      }
      return !v;
    });
  const [exportTable, setExportTable] = React.useState<(() => void) | null>(
    null,
  );
  const table = React.useMemo<PreviewTable>(
    () => ({
      shown: tableShown,
      setExport: (fn) => setExportTable(() => fn),
    }),
    [tableShown],
  );

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
          {exportTable ? (
            <>
              {metric.viewType !== 'table' ? (
                <Tooltip
                  title={tableShown ? t('Hide the table') : t('Show the table')}
                >
                  <span className="inline-flex">
                    <IconButton
                      icon={<Table2 size={15} />}
                      label={
                        tableShown ? t('Hide the table') : t('Show the table')
                      }
                      variant="ghost"
                      pressed={tableShown}
                      onClick={toggleTable}
                    />
                  </span>
                </Tooltip>
              ) : null}
              <Tooltip title={t('Export as CSV')}>
                <span className="inline-flex">
                  <IconButton
                    icon={<Download size={15} />}
                    label={t('Export as CSV')}
                    variant="ghost"
                    onClick={exportTable}
                  />
                </span>
              </Tooltip>
            </>
          ) : null}
        </div>
      </div>
      <div className="m-cardp__chart">
        <PreviewTableContext.Provider value={table}>
          <Suspense fallback={<Loader loading style={{ height: 240 }} />}>
            <WidgetChart isPreview metric={metric} />
          </Suspense>
        </PreviewTableContext.Provider>
      </div>
    </div>
  );
}

export default observer(WidgetPreview);
