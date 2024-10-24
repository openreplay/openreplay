import { useQuery } from '@tanstack/react-query';
import { Segmented } from 'antd';
import React from 'react';
import { VList, VListHandle } from 'virtua';
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

  return json.map(processLog);
}

function BackendLogsPanel() {
  const { projectsStore, sessionStore, integrationsStore } = useStore();
  const integratedServices =
    integrationsStore.integrations.backendLogIntegrations;
  const defaultTab = integratedServices[0]!.name;
  const sessionId = sessionStore.currentId;
  const projectId = projectsStore.siteId!;
  const [tab, setTab] = React.useState<ServiceName>(defaultTab as ServiceName);
  const { data, isError, isPending, isSuccess } = useQuery<
    UnifiedLog[]
  >({
    queryKey: ['integrationLogs', tab],
    staleTime: 0,
    queryFn: () => fetchLogs(tab!, projectId, sessionId),
    enabled: tab !== null,
  });
  const [filter, setFilter] = React.useState('');
  const _list = React.useRef<VListHandle>(null);
  const activeIndex = 1;
  React.useEffect(() => {
    if (_list.current) {
      _list.current.scrollToIndex(activeIndex);
    }
  }, [activeIndex]);

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
            onRetry={() => console.log('hi')}
          />
        ) : null}
        {isSuccess ? (
          <>
            <TableHeader size={data.length} />
            <VList ref={_list} count={testLogs.length}>
              {data.map((log, index) => (
                <LogRow key={index} log={log} />
              ))}
            </VList>
          </>
        ) : null}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

const testLogs = [
  {
    key: 1,
    timestamp: '2021-09-01 12:00:00',
    status: 'INFO',
    content: 'This is a test log',
  },
  {
    key: 2,
    timestamp: '2021-09-01 12:00:00',
    status: 'WARN',
    content: 'This is a test log',
  },
  {
    key: 3,
    timestamp: '2021-09-01 12:00:00',
    status: 'ERROR',
    content:
      'This is a test log that is very long and should be truncated to fit in the table cell and it will be displayed later in a separate thing when clicked on a row because its so long you never gonna give htem up or alskjhaskfjhqwfhwekfqwfjkqlwhfkjqhflqkwjhefqwklfehqwlkfjhqwlkjfhqwe \n kjhdafskjfhlqkwjhfwelefkhwqlkqehfkqlwehfkqwhefkqhwefkjqwhf',
  },
];

export default observer(BackendLogsPanel);
