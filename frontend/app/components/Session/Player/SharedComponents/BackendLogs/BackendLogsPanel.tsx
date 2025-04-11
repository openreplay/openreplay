import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { VList, VListHandle } from 'virtua';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore, client } from 'App/mstore';
import {
  ServiceName,
  serviceNames,
} from 'App/components/Client/Integrations/apiMethods';
import BottomBlock from 'App/components/shared/DevTools/BottomBlock';
import { capitalize } from 'App/utils';
import { Icon } from 'UI';
import { Segmented, Input, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { processLog, UnifiedLog } from './utils';
import { FailedFetch, LoadingFetch } from './StatusMessages';
import { TableHeader, LogRow } from './Table';
import { useTranslation } from 'react-i18next';

async function fetchLogs(
  tab: string,
  projectId: string,
  sessionId: string,
): Promise<UnifiedLog[]> {
  const data = await client.get(
    `/integrations/v1/integrations/${tab}/${projectId}/data/${sessionId}`,
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

  const onFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const tabs = Object.entries(serviceNames)
    .filter(
      ([slug]) => integratedServices.findIndex((i) => i.name === slug) !== -1,
    )
    .map(([slug, name]) => ({
      label: (
        <div className="flex items-center gap-2">
          <Icon size={14} name={`integrations/${slug}`} /> <div>{name}</div>
        </div>
      ),
      value: slug,
    }));

  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2 items-center">
            <div className="font-semibold">{t('Traces')}</div>
            {tabs.length && tab ? (
              <div>
                <Segmented
                  options={tabs}
                  value={tab}
                  onChange={setTab}
                  size="small"
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Segmented
              options={[
                { label: t('All Tabs'), value: 'all' },
                {
                  label: (
                    <Tooltip
                      title={t(
                        'Backend logs are fetched for all tabs combined.',
                      )}
                    >
                      <span>{t('Current Tab')}</span>
                    </Tooltip>
                  ),
                  value: 'current',
                  disabled: true,
                },
              ]}
              defaultValue="all"
              size="small"
              className="rounded-full font-medium"
            />

            <Input
              className="rounded-lg"
              placeholder={t('Filter by keyword')}
              name="filter"
              onChange={onFilterChange}
              value={filter}
              size="small"
              prefix={<SearchOutlined className="text-neutral-400" />}
            />
          </div>
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
      <VList ref={_list} count={data.length}>
        {data.map((log, index) => (
          <LogRow
            key={index}
            isActive={index === activeIndex}
            log={log}
            onJump={onJump}
          />
        ))}
      </VList>
    </>
  );
});

export default observer(BackendLogsPanel);
