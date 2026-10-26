import { HEATMAP_SCROLL_MAP } from '@/constants/card';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'App/components/Dashboard/charts.css';
import ClickMapRenderer from 'App/components/Session/Player/ClickMapRenderer';
import { useStore } from 'App/mstore';
import { hasRuleValue } from 'App/utils/hasRuleValue';
import NoDataInWindow from 'Components/Dashboard/components/NoDataInWindow';

import { heatmapJumpTime } from './heatmapJumpTime';
import { type ScrollReach, scrollReach } from './scrollReach';

function ClickMapCard() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const metric = metricStore.instance;
  const { data } = metric;
  const { sessionId } = data;
  const scrollMap = metric.metricOf === HEATMAP_SCROLL_MAP;

  // metric.data is mutated in place on every refetch; the player keeps this copy
  const session = React.useMemo(() => ({ ...data }), [sessionId]);
  const reach = React.useMemo(() => scrollReach(data.scroll), [data.scroll]);

  // a page was asked for and the window holds no recording of it; a group
  // property alone says whose clicks, not where
  const asked = metric.series.some((s: any) =>
    (s.filter?.filters ?? []).some((f: any) => f.isEvent && hasRuleValue(f)),
  );
  if (!data.domURL && asked) {
    return <NoDataInWindow />;
  }
  const empty = (
    <EmptyState
      mark="heatmap"
      title={t('Select a page to start seeing the heatmap')}
      hint={t('Add the page in the definition.')}
    />
  );
  if (!data.domURL) return empty;
  if (!sessionId) {
    return <p className="m-funnel__empty">{t('Loading session…')}</p>;
  }
  // drawn from the data at hand: after a Click/Scroll switch the previous map
  // stays until the other one's data arrives
  const points = reach ? null : data.points?.length ? data.points : null;
  if (!reach && !points) {
    return scrollMap ? (
      <EmptyState
        mark="heatmap"
        title={t('No scroll depth recorded on this page yet')}
        hint={t(
          'Scroll maps come from sessions recorded with scroll tracking.',
        )}
      />
    ) : (
      empty
    );
  }

  const url =
    data.urlPath ??
    metric.series[0]?.filter.filters
      .find((f: any) => f.isEvent)
      ?.filters?.find((f: any) => f.name === 'url_path')?.value?.[0];

  return (
    <div id="clickmap-render" className="m-cmap isolate">
      <ClickMapRenderer
        key={sessionId}
        session={session}
        jumpTimestamp={heatmapJumpTime(data)}
        points={points}
        reach={reach}
      />
      <HeatmapLegend url={url} points={points} reach={reach} />
    </div>
  );
}

function HeatmapLegend({
  url,
  points,
  reach,
}: {
  url?: string;
  points: { count?: number }[] | null;
  reach: ScrollReach | null;
}) {
  const { t } = useTranslation();
  const clicks = points?.reduce((n, p) => n + (p.count ?? 1), 0) ?? 0;
  return (
    <p className="m-cmap__legend">
      {url && <span className="m-cmap__url m-mono">{url}</span>}
      {reach ? (
        <>
          <span>
            {t('{{n}} sessions', {
              count: reach.sessions,
              n: reach.sessions.toLocaleString(),
            })}
          </span>
          <span>
            {t('Half reach {{depth}}% of the page', { depth: reach.median })}
          </span>
          <span
            className="m-cmap__scale is-scroll m-scheme-light"
            aria-hidden="true"
          >
            <i /> {t('few reached')} <b /> {t('all reached')}
          </span>
        </>
      ) : (
        <>
          <span>
            {t('{{n}} clicks', {
              count: clicks,
              n: clicks.toLocaleString(),
            })}
          </span>
          <span className="m-cmap__scale is-click" aria-hidden="true">
            <i /> {t('fewer')} <b /> {t('more')}
          </span>
        </>
      )}
    </p>
  );
}

export default observer(ClickMapCard);
