import React from 'react';
import { numberWithCommas } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function NewEventsBadge() {
  const { analyticsStore } = useStore();
  const { t } = useTranslation();
  const count = analyticsStore.newEvents;

  const onReload = () => {
    analyticsStore.fetchEvents();
  }

  return count > 0 ? (
    <div
      className="bg-amber p-1 flex w-full border-b text-center justify-center link border-t border-t-gray-light"
      onClick={onReload}
    >
      {t('Show')} {numberWithCommas(count)} {t('New')}{' '}
      {count > 1 ? t('Events') : t('Event')}
    </div>
  ) : null;
}

export default observer(NewEventsBadge);
