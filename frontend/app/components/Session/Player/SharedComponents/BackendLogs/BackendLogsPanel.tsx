import { useQuery } from '@tanstack/react-query';
import { Segmented } from 'antd';
import React from 'react';
import { VList, VListHandle } from 'virtua';
import { PlayerContext } from "App/components/Session/playerContext";
import { processLog, UnifiedLog } from './utils';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import {
  ServiceName,
  serviceNames,
} from 'App/components/Client/Integrations/apiMethods';
import BottomBlock from 'App/components/shared/DevTools/BottomBlock';
import { capitalize } from 'App/utils';
import { Icon, Input } from 'UI';
import { client } from 'App/mstore';
import { FailedFetch, LoadingFetch } from "./StatusMessages";
import {
  TableHeader,
  LogRow
} from './Table'

async function fetchLogs(
  tab: string,
  projectId: string,
  sessionId: string
): Promise<UnifiedLog[]> {
  const data = await client.get(
    `/integrations/v1/integrations/${tab}/${projectId}/data/${sessionId}`
  );
  const json = await data.json();
  try {
    const logsResp = await fetch(json.url)
    if (logsResp.ok) {
      const logJson = await logsResp.json()
      if (logJson.length === 0) return []
      return processLog(logJson)
    } else {
      throw new Error('Failed to fetch logs')
    }
  } catch (e) {
    console.log(e)
    throw e
  }
}

function BackendLogsPanel() {
  const { projectsStore, sessionStore, integrationsStore } = useStore();
  const integratedServices = integrationsStore.integrations.backendLogIntegrations;
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

  const onFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const tabs = Object.entries(serviceNames)
    .filter(
      ([slug]) => integratedServices.findIndex((i) => i.name === slug) !== -1
    )
    .map(([slug, name]) => ({
      label: (
        <div className={'flex items-center gap-2'}>
          <Icon size={14} name={`integrations/${slug}`} /> <div>{name}</div>
        </div>
      ),
      value: slug,
    }));

  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <div className={'flex gap-2 items-center w-full'}>
          <div className={'font-semibold'}>Traces</div>
          {tabs.length && tab ? (
            <div>
              <Segmented options={tabs} value={tab} onChange={setTab} />
            </div>
          ) : null}

          <div className={'ml-auto'} />
          <Input
            className="input-small h-8"
            placeholder="Filter by keyword"
            icon="search"
            name="filter"
            height={28}
            onChange={onFilterChange}
            value={filter}
          />
        </div>
      </BottomBlock.Header>

      <BottomBlock.Content className="overflow-y-auto">
        {isPending ? (
          <LoadingFetch provider={capitalize(tab)} />
        ) : null}
        {isError ? (
          <FailedFetch
            provider={capitalize(tab)}
            onRetry={refetch}
          />
        ) : null}
        {isSuccess ? (
          <LogsTable data={data} />
        ) : null}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

const LogsTable = observer(({ data }: { data: UnifiedLog[] }) => {
  const { store, player } = React.useContext(PlayerContext);
  const time = store.get().time;
  const sessionStart = store.get().sessionStart;
  const _list = React.useRef<VListHandle>(null);
  const activeIndex = React.useMemo(() => {
    const currTs = time + sessionStart;
    const index = data.findIndex(
      (log) => log.timestamp !== 'N/A' ? new Date(log.timestamp).getTime() >= currTs : false
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
  }
  return (
    <>
      <TableHeader size={data.length} />
      <VList ref={_list} count={data.length}>
        {data.map((log, index) => (
          <LogRow key={index} isActive={index === activeIndex} log={log} onJump={onJump} />
        ))}
      </VList>
    </>
  )
});

export default observer(BackendLogsPanel);
