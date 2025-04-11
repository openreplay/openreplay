import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import FunnelIssuesDropdown from '../FunnelIssuesDropdown';
import FunnelIssuesSort from '../FunnelIssuesSort';
import FunnelIssuesList from '../FunnelIssuesList';
import { useTranslation } from 'react-i18next';

function FunnelIssues() {
  const { t } = useTranslation();
  const { metricStore, dashboardStore } = useStore();
  const [data, setData] = useState<any>({ issues: [] });
  const [loading, setLoading] = useState(false);
  const widget: any = useObserver(() => metricStore.instance);
  const funnel = useObserver(() => widget.data.funnel || { stages: [] });
  const stages = useObserver(() =>
    funnel.stages.filter((stage: any) => stage.isActive),
  );
  const isMounted = useIsMounted();

  const fetchIssues = (filter: any) => {
    if (!isMounted()) return;
    setLoading(true);

    const newFilter = {
      ...filter,
      metricType: widget.metricType,
      metricFormat: widget.metricFormat,
      metricOf: widget.metricOf,
      metricValue: widget.metricValue,
      series: filter.series.map((item: any) => ({
        ...item,
        filter: {
          ...item.filter,
          filters: item.filter.filters
            .filter((filter: any, index: any) => {
              const stage = widget.data.funnel?.stages[index];
              return stage && stage.isActive;
            })
            .map((f: any) => f.toJson()),
        },
      })),
    };
    widget
      .fetchIssues(newFilter)
      .then((res: any) => {
        setData(res);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const filter = useObserver(() => dashboardStore.drillDownFilter);
  const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
  const debounceRequest: any = React.useCallback(
    debounce(fetchIssues, 1000),
    [],
  );
  const depsString = JSON.stringify(widget.series);

  useEffect(() => {
    debounceRequest({
      ...filter,
      series: widget.series,
      page: metricStore.sessionsPage,
      limit: metricStore.sessionsPageSize,
    });
  }, [
    stages.length,
    drillDownPeriod,
    filter.filters,
    depsString,
    metricStore.sessionsPage,
  ]);

  return useObserver(() => (
    <div className="bg-white rounded-lg mt-4 p-4 border">
      <div className="flex">
        <h2 className="font-medium text-xl">
          {t('Significant issues')}
          <span className="font-normal">&nbsp;{t('in this funnel')}</span>
        </h2>
      </div>
      <div className="my-6 flex justify-between items-center">
        <FunnelIssuesDropdown />
        <div className="flex-shrink-0">
          <FunnelIssuesSort />
        </div>
      </div>
      <Loader loading={loading}>
        <FunnelIssuesList issues={data.issues} />
      </Loader>
    </div>
  ));
}

export default FunnelIssues;
