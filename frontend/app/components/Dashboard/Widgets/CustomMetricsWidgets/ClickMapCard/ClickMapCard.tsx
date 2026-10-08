import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'App/components/Dashboard/charts.css';
import ClickMapRenderer from 'App/components/Session/Player/ClickMapRenderer';
import { useStore } from 'App/mstore';

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
        // snapshot: metric.data is mutated in place on every refetch, so keeping
        // the reference would make the sessionId check above always false
        setCustomSession({ ...metricStore.instance.data });
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

    void fetchInsights(metric, payload);
  }, [
    sessionId,
    dashboardStore.drillDownPeriod.start,
    dashboardStore.drillDownPeriod.end,
    dashboardStore.drillDownPeriod.rangeValue,
    metricStore.includeClickRage,
  ]);

  if (!metricStore.instance.data.domURL || insights.length === 0) {
    return (
      <p className="m-funnel__empty">
        {t(
          'Set a start point to visualize the heatmap. If set, try adjusting filters.',
        )}
      </p>
    );
  }

  if (!metricStore.instance.data?.sessionId || !customSession) {
    return <p className="m-funnel__empty">{t('Loading session…')}</p>;
  }

  const jumpToEvent = {
    timestamp:
      metricStore.instance.data.eventTimestamp ||
      metricStore.instance.data.startTs,
    domBuildingTime: metricStore.instance.data.domBuildingTime || 0,
  };
  const ts = jumpToEvent.timestamp ?? metricStore.instance.data.startTs;
  const domTime = jumpToEvent.domBuildingTime ?? 0;
  // player timeline is zeroed on the session's real start, not on the
  // second-truncated startTs the heatmap query returns
  const sessionStart =
    metricStore.instance.data.startedAt ?? metricStore.instance.data.startTs;
  const jumpTimestamp = Math.max(0, ts - sessionStart + domTime + 10);

  return (
    <div
      id="clickmap-render"
      className="isolate"
      style={{ transformStyle: 'flat' }}
    >
      <ClickMapRenderer
        session={customSession}
        jumpTimestamp={jumpTimestamp}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}

export default observer(ClickMapCard);
