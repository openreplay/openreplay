import { CopyOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Segmented } from 'antd';
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import React from 'react';
import { VList, VListHandle } from 'virtua';

import BottomBlock from 'App/components/shared/DevTools/BottomBlock';
import { capitalize } from 'App/utils';
import { Icon, Input } from 'UI';

function fetchLogs(tab: string): Promise<typeof testLogs> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(testLogs);
    }, 1000);
  });
}

function BackendLogsPanel() {
  const [tab, setTab] = React.useState('dynatrace');
  const {
    data = [],
    isError,
    isPending,
  } = useQuery<typeof testLogs>({
    queryKey: ['integrationLogs', tab],
    queryFn: () => fetchLogs(tab),
  });
  const [filter, setFilter] = React.useState('');
  const _list = React.useRef<VListHandle>(null);
  const activeIndex = 1;
  React.useEffect(() => {
    if (_list.current) {
      _list.current.scrollToIndex(activeIndex);
    }
  }, [activeIndex]);

  const onFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const tabs = [
    {
      label: (
        <div className={'flex items-center gap-2'}>
          <Icon size={14} name={'integrations/dynatrace'} /> <div>Dynatrace</div>
        </div>
      ),
      value: 'dynatrace',
    },
    {
      label: (
        <div className={'flex items-center gap-2'}>
          <Icon size={14} name={'integrations/elasticsearch'} /> <div>Elastic</div>
        </div>
      ),
      value: 'elastic',
    },
    {
      label: (
        <div className={'flex items-center gap-2'}>
          <Icon size={14} name={'integrations/datadog'} /> <div>Datadog</div>
        </div>
      ),
      value: 'datadog',
    },
  ];
  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <div className={'flex gap-2 items-center w-full'}>
          <div className={'font-semibold'}>Traces</div>
          <div>
            <Segmented options={tabs} value={tab} onChange={setTab} />
          </div>

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
          <div
            className={
              'w-full h-full flex items-center justify-center flex-col gap-2'
            }
          >
            <Icon name={'spinner'} size={40} />
            <div>Fetching logs from {tab}...</div>
          </div>
        ) : null}
        {isError ? (
          <div
            className={
              'w-full h-full flex items-center justify-center flex-col gap-2'
            }
          >
            <Icon name={'exclamation-circle'} size={40} />
            <div>
              <span>Failed to fetch logs from {capitalize(tab)}.</span>
              <span>Retry</span>
            </div>
            <div>Check configuration</div>
          </div>
        ) : null}
        <TableHeader size={data.length} />
        <VList ref={_list} count={testLogs.length}>
          {data.map((log, index) => (
            <LogRow key={index} log={log} />
          ))}
        </VList>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

const testLogs = [
  {
    timestamp: '2021-09-01 12:00:00',
    status: 'INFO',
    content: 'This is a test log',
  },
  {
    timestamp: '2021-09-01 12:00:00',
    status: 'WARN',
    content: 'This is a test log',
  },
  {
    timestamp: '2021-09-01 12:00:00',
    status: 'ERROR',
    content:
      'This is a test log that is very long and should be truncated to fit in the table cell and it will be displayed later in a separate thing when clicked on a row because its so long you never gonna give htem up or alskjhaskfjhqwfhwekfqwfjkqlwhfkjqhflqkwjhefqwklfehqwlkfjhqwlkjfhqwe \n kjhdafskjfhlqkwjhfwelefkhwqlkqehfkqlwehfkqwhefkqhwefkjqwhf',
  },
];

function TableHeader({ size }: { size: number }) {
  return (
    <div className={'grid grid-cols-12 items-center py-2 px-4 bg-gray-lighter'}>
      <div className={'col-span-1'}>timestamp</div>
      <div className={'col-span-1 pl-2'}>status</div>
      <div className={'col-span-10 flex items-center justify-between'}>
        <div>content</div>
        <div><span className={'font-semibold'}>{size}</span> Records</div>
      </div>
    </div>
  );
}

function LogRow({
  log,
}: {
  log: { timestamp: string; status: string; content: string };
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const bg = (status: string) => {
    //types: warn error info none
    if (status === 'WARN') {
      return 'bg-yellow';
    }
    if (status === 'ERROR') {
      return 'bg-red-lightest';
    }
    return 'bg-white';
  };

  const border = (status: string) => {
    //types: warn error info none
    if (status === 'WARN') {
      return 'border-l border-l-4 border-l-amber-500';
    }
    if (status === 'ERROR') {
      return 'border-l border-l-4 border-l-red';
    }
    return 'border-l border-l-4 border-gray-lighter';
  }
  return (
    <div className={'code-font'}>
      <div
        className={cn(
          'text-sm grid grid-cols-12 items-center py-2 px-4',
          'cursor-pointer border-b border-b-gray-light last:border-b-0',
          border(log.status),
          bg(log.status)
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={'col-span-1'}>
          <div className={'flex items-center gap-2'}>
            <Icon
              name={'chevron-down'}
              className={
                isExpanded ? 'rotate-180 transition' : 'rotate-0 transition'
              }
            />
            <div>{log.timestamp}</div>
          </div>
        </div>
        <div className={'col-span-1 pl-2'}>{log.status}</div>
        <div
          className={
            'col-span-10 whitespace-nowrap overflow-hidden text-ellipsis'
          }
        >
          {log.content}
        </div>
      </div>
      {isExpanded ? (
        <div className={'rounded bg-gray-lighter p-2 relative m-2'}>
          {log.content}

          <div className={'absolute top-1 right-1'}>
            <Button
              size={'small'}
              icon={<CopyOutlined />}
              onClick={() => copy(log.content)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BackendLogsPanel;
