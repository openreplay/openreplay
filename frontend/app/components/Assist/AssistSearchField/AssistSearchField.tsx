import React from 'react';
import { Button } from 'antd';
import { useModal } from 'App/components/Modal';
import SessionSearchField from 'Shared/SessionSearchField';
import { MODULES } from 'Components/Client/Modules';

import AssistStats from '../../AssistStats';
import Recordings from '../RecordingsList/Recordings';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function AssistSearchField() {
  const { searchStoreLive, userStore } = useStore();
  const modules = userStore.account.settings?.modules ?? [];
  const isEnterprise = userStore.isEnterprise
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
  return (
    <div className="flex items-center w-full gap-2">
      <div style={{ width: '60%' }}>
        <SessionSearchField />
      </div>
      {isEnterprise && modules.includes(MODULES.OFFLINE_RECORDINGS)
        ? <Button type="primary" ghost onClick={showRecords}>Training Videos</Button> : null
      }
      <Button type="primary" ghost onClick={showStats}
              disabled={modules.includes(MODULES.ASSIST_STATS) || modules.includes(MODULES.ASSIST)}>Co-Browsing
        Reports</Button>
      <Button
        type="link"
        className="ml-auto font-medium"
        disabled={!hasFilters && !hasEvents}
        onClick={() => searchStoreLive.clearSearch()}
      >
        Clear Search
      </Button>
    </div>
  );
}

export default observer(AssistSearchField);
