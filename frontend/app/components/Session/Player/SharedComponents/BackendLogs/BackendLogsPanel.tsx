import { Icon } from '@/ui/icons/Icon';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import {
  ServiceName,
  serviceNames,
} from 'App/components/Client/Integrations/apiMethods';
import { PlayerContext } from 'App/components/Session/playerContext';
import BottomBlock from 'App/components/shared/DevTools/BottomBlock';
import { client, useStore } from 'App/mstore';
import { capitalize } from 'App/utils';

import { Keyword, PanelTabs } from 'Shared/DevTools/PanelKit';

import { FailedFetch, LoadingFetch } from './StatusMessages';
import { LogRow, TableHeader } from './Table';
import { UnifiedLog, processLog } from './utils';

async function fetchLogs(
  tab: string,
  projectId: string,
  sessionId: string,
): Promise<UnifiedLog[]> {
  const data = await client.get(
    `/${projectId}/integration/${tab}/data/${sessionId}`,
  );
  const json = await data.json();
  try {
    const logsResp = await fetch(json.url);
    if (logsResp.ok) {
      const logJson = await logsResp.json();
      if (logJson.length === 0) return [];
      return processLog(logJson);
    }
    throw new Error('Failed to fetch logs');
  } catch (e) {
    console.log(e);
    throw e;
  }
}

function BackendLogsPanel() {
  const { t } = useTranslation();
  const { projectsStore, sessionStore, integrationsStore } = useStore();
  const integratedServices =
    integrationsStore.integrations.backendLogIntegrations;
  const defaultTab = integratedServices[0]!.name;
  const sessionId = sessionStore.currentId;
  const projectId = projectsStore.siteId!;
  const [tab, setTab] = React.useState<ServiceName>(defaultTab as ServiceName);
  const { data, isError, isPending, isSuccess, refetch } = useQuery<
    UnifiedLog[]
  >({
    queryKey: ['integrationLogs', tab, sessionId],
    staleTime: 1000 * 30,
    queryFn: () => fetchLogs(tab!, projectId, sessionId),
    enabled: tab !== null,
    retry: 3,
  });
  const [filter, setFilter] = React.useState('');

  const tabs = Object.entries(serviceNames)
    .filter(
      ([slug]) => integratedServices.findIndex((i) => i.name === slug) !== -1,
    )
    .map(([slug, name]) => ({ name, value: slug }));

  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        {tabs.length && tab ? (
          <PanelTabs
            label={t('Trace source')}
            active={tab}
            onSelect={(v) => setTab(v as ServiceName)}
            items={tabs.map((x) => ({
              key: x.value,
              label: x.name,
              icon: <Icon size={13} name={`integrations/${x.value}`} />,
            }))}
          />
        ) : (
          <span />
        )}
        <div className="m-dt__bar-right">
          <Keyword value={filter} onChange={setFilter} />
        </div>
      </BottomBlock.Header>

      <BottomBlock.Content className="overflow-y-auto">
        {isPending ? <LoadingFetch provider={capitalize(tab)} /> : null}
        {isError ? (
          <FailedFetch provider={capitalize(tab)} onRetry={refetch} />
        ) : null}
        {isSuccess ? <LogsTable data={data} /> : null}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

const LogsTable = observer(({ data }: { data: UnifiedLog[] }) => {
  const { store, player } = React.useContext(PlayerContext);
  const { time } = store.get();
  const { sessionStart } = store.get();
  const _list = React.useRef<VListHandle>(null);
  const activeIndex = React.useMemo(() => {
    const currTs = time + sessionStart;
    const index = data.findIndex((log) =>
      log.timestamp !== 'N/A'
        ? new Date(log.timestamp).getTime() >= currTs
        : false,
    );
    return index === -1 ? data.length - 1 : index;
  }, [time, data.length]);
  React.useEffect(() => {
    if (_list.current) {
      _list.current.scrollToIndex(activeIndex);
    }
  }, [activeIndex]);

  const onJump = (ts: number) => {
    player.jump(ts - sessionStart);
  };
  return (
    <>
      <TableHeader size={data.length} />
      <VList ref={_list} data={data}>
        {(log, index) => (
          <LogRow
            key={index}
            isActive={index === activeIndex}
            log={log}
            onJump={onJump}
          />
        )}
      </VList>
    </>
  );
});

export default observer(BackendLogsPanel);
