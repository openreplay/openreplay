import { EmptyState } from '@/ui/feedback/EmptyState';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { windowPhrase } from 'App/utils/windowPhrase';

import '../charts.css';

/**
 * A card with nothing in its window, the same on every kind. In the builder
 * the preview is the page, so it gets the page's empty state; a widget gets
 * two lines and is as tall as they are.
 */
function NoDataInWindow({
  inGrid = false,
  list = false,
}: {
  inGrid?: boolean;
  /** a list fills in; anything else is a card */
  list?: boolean;
}) {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const period = inGrid
    ? dashboardStore.period
    : dashboardStore.drillDownPeriod;
  const title = t('Nothing {{window}}', { window: windowPhrase(t, period) });
  return inGrid ? (
    <EmptyState
      className="m-nodata is-compact"
      title={title}
      hint={t('Widen the window above.')}
    />
  ) : (
    <EmptyState
      art="window"
      title={title}
      hint={
        list
          ? t('Widen the window above and the list fills in.')
          : t('Widen the window above and the card fills in.')
      }
    />
  );
}

export default observer(NoDataInWindow);
