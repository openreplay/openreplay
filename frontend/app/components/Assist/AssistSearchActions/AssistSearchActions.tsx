import React from 'react';
import { Button, Tooltip } from 'antd';
import { useModal } from 'App/components/Modal';
import { MODULES } from 'Components/Client/Modules';

import AssistStats from '../../AssistStats';
import Recordings from '../RecordingsList/Recordings';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function AssistSearchActions() {
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
      {isEnterprise && !modules.includes(MODULES.OFFLINE_RECORDINGS)
        ? <Button type="text" onClick={showRecords}>Training Videos</Button> : null
      }
      {isEnterprise && userStore.account?.admin && (
        <Button type="text" onClick={showStats}
                disabled={modules.includes(MODULES.ASSIST_STATS) || modules.includes(MODULES.ASSIST)}>
          Co-Browsing Reports</Button>
      )}
      <Tooltip title='Clear Search Filters'>
        <Button
          type="text"
          disabled={!hasFilters && !hasEvents}
          onClick={() => searchStoreLive.clearSearch()}
          className="px-2 ml-auto"
        >
          Clear
        </Button>
      </Tooltip>
    </div>
  );
}

export default observer(AssistSearchActions);
