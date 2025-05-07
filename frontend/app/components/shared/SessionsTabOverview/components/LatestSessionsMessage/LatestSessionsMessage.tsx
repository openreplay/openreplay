import React from 'react';
import { numberWithCommas } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function LatestSessionsMessage() {
  const { searchStore } = useStore();
  const { t } = useTranslation();
  const count = searchStore.latestSessionCount;

  const onShowNewSessions = () => {
    searchStore.updateLatestSessionCount(0);
    void searchStore.updateCurrentPage(1, true);
  };

  return count > 0 ? (
    <div
      className="bg-amber p-1 flex w-full border-b text-center justify-center link"
      onClick={onShowNewSessions}
    >
      {t('Show')} {numberWithCommas(count)} {t('New')}{' '}
      {count > 1 ? t('Sessions') : t('Session')}
    </div>
  ) : null;
}

export default observer(LatestSessionsMessage);
