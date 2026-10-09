import { EmptyState } from '@/ui/feedback/EmptyState';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { windowPhrase } from 'App/utils/windowPhrase';

/**
 * A card with nothing in its window. In the builder the preview is the page,
 * so it gets the page's empty state; in a dashboard widget the words alone.
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
    <EmptyState title={title} />
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
