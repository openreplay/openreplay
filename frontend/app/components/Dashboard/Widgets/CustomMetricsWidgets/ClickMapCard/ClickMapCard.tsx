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

function ClickMapCard() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const { data } = metricStore.instance;
  const { sessionId } = data;

  // metric.data is mutated in place on every refetch; the player keeps this copy
  const session = React.useMemo(() => ({ ...data }), [sessionId]);

  // a page was asked for and the window holds no recording of it; a group
  // property alone says whose clicks, not where
  const asked = metricStore.instance.series.some((s: any) =>
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
  if (!data.points?.length) return empty;

  return (
    <div
      id="clickmap-render"
      className="isolate"
      style={{ transformStyle: 'flat' }}
    >
      <ClickMapRenderer
        key={sessionId}
        session={session}
        jumpTimestamp={heatmapJumpTime(data)}
        points={data.points}
      />
    </div>
  );
}

export default observer(ClickMapCard);
