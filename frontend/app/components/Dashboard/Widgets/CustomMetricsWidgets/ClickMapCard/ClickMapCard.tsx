import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ClickMapRenderer from 'App/components/Session/Player/ClickMapRenderer';
import { NoContent } from 'App/components/ui';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

function ClickMapCard() {
  const { t } = useTranslation();
  const [customSession, setCustomSession] = React.useState<any>(null);
  const { metricStore, dashboardStore, sessionStore } = useStore();
  const { fetchInsights } = sessionStore;
  const { insights } = sessionStore;

  const onMarkerClick = (s: string, innerText: string) => {
    metricStore.changeClickMapSearch(s, innerText);
  };

  const { sessionId } = metricStore.instance.data;

  React.useEffect(() => () => setCustomSession(null), []);

  React.useEffect(() => {
    if (
      metricStore.instance.data.domURL &&
      sessionId &&
      sessionId !== customSession?.sessionId
    ) {
      setCustomSession(null);
      setTimeout(() => {
        setCustomSession(metricStore.instance.data);
      }, 100);
    }
  }, [metricStore.instance, sessionId]);

  React.useEffect(() => {
    if (!sessionId) return;

    const metric = metricStore.instance;
    const payload = {
      ...metric.toJson(),
      ...dashboardStore.drillDownPeriod.toTimestamps(),
      metricType: 'heatmaps_session',
      limit: 200,
      density: 200,
    };

    if (payload && !hasLocationFilter(payload)) {
      payload.series[0].filter.filters = payload.series[0].filter.filters.map(
        (filter: any) => {
          if (filter.name === 'LOCATION') {
            filter.filters = filter.filters.map((filter: any) => {
              if (filter.name === 'urlPath' && !!metric.data.urlPath) {
                filter.value = [metric.data.urlPath];
              }
              return filter;
            });
          }
          return filter;
        },
      );
    }
    console.log('changes', sessionId,
    dashboardStore.drillDownPeriod.start,
    dashboardStore.drillDownPeriod.end,
    dashboardStore.drillDownPeriod.rangeValue,
    metricStore.includeClickRage,)
    void fetchInsights(metric, payload);
  }, [
    sessionId,
    dashboardStore.drillDownPeriod.start,
    dashboardStore.drillDownPeriod.end,
    dashboardStore.drillDownPeriod.rangeValue,
    metricStore.includeClickRage,
  ]);

  const hasLocationFilter = (payload: any) => {
    return payload.series[0]?.filter?.filters?.some((filter: any) => {
      return (
        filter.name === 'LOCATION' &&
        filter.filters.some(
          (filter: any) =>
            filter.name === 'urlPath' &&
            filter.value.length > 0 &&
            filter.value[0].length > 0,
        )
      );
    });
  };

  if (!metricStore.instance.data.domURL || insights.length === 0) {
    return (
      <NoContent
        style={{ minHeight: 220 }}
        title={
          <div className="flex items-center relative">
            <InfoCircleOutlined className="hidden md:inline-block mr-1" />
            {t(
              'Set a start point to visualize the heatmap. If set, try adjusting filters.',
            )}
          </div>
        }
        show
      />
    );
  }

  if (!metricStore.instance.data?.sessionId || !customSession) {
    return <div className="py-2">{t('Loading session')}</div>;
  }

  const jumpToEvent = {
    timestamp:
      metricStore.instance.data.eventTimestamp ||
      metricStore.instance.data.startTs,
    domBuildingTime: metricStore.instance.data.domBuildingTime || 0,
  };
  const ts = jumpToEvent.timestamp ?? metricStore.instance.data.startTs;
  const domTime = jumpToEvent.domBuildingTime ?? 0;
  const jumpTimestamp = ts - metricStore.instance.data.startTs + domTime + 10;

  return (
    <div id="clickmap-render">
      <ClickMapRenderer
        session={customSession}
        jumpTimestamp={jumpTimestamp}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}

export default observer(ClickMapCard);
