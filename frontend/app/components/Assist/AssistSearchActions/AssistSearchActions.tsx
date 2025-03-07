import React from 'react';
import { Button, Tooltip } from 'antd';
import { useModal } from 'App/components/Modal';
import { MODULES } from 'Components/Client/Modules';

import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AssistStats from '../../AssistStats';
import Recordings from '../RecordingsList/Recordings';
import { useTranslation } from 'react-i18next';

function AssistSearchActions() {
  const { t } = useTranslation();
  const { searchStoreLive, userStore } = useStore();
  const modules = userStore.account.settings?.modules ?? [];
  const { isEnterprise } = userStore;
  const hasEvents =
    searchStoreLive.instance.filters.filter((i: any) => i.isEvent).length > 0;
  const hasFilters =
    searchStoreLive.instance.filters.filter((i: any) => !i.isEvent).length > 0;
  const { showModal } = useModal();

  const showStats = () => {
    showModal(<AssistStats />, { right: true, width: 960 });
  };
  const showRecords = () => {
    showModal(<Recordings />, { right: true, width: 960 });
  };

  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  return (
    <div className="flex items-center w-full gap-2">
      <h3 className="text-2xl capitalize mr-2">
        <span>{t('Co-Browse')}</span>
      </h3>
      <Tooltip title={t('Clear Search Filters')}>
        <Button
          type="text"
          disabled={!hasFilters && !hasEvents}
          onClick={() => searchStoreLive.clearSearch()}
          className="px-2 ml-auto"
        >
          {t('Clear')}
        </Button>
      </Tooltip>
      {!isSaas && isEnterprise && !modules.includes(MODULES.OFFLINE_RECORDINGS)
       ? <Button size={'small'} onClick={showRecords}>{t('Training Videos')}</Button> : null
      }
      {isEnterprise && userStore.account?.admin && (
        <Button size={'small'} onClick={showStats}
                disabled={modules.includes(MODULES.ASSIST_STATS) || modules.includes(MODULES.ASSIST)}>
          {t('Co-Browsing Reports')}
        </Button>
      )}
    </div>
  );
}

export default observer(AssistSearchActions);
