import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Input } from 'antd';
import { VList, VListHandle } from 'virtua';
import { PlayerContext } from 'App/components/Session/playerContext';
import JumpButton from '../JumpButton';
import { useRegExListFilterMemo } from '../useListFilter';
import BottomBlock from '../BottomBlock';
import { NoContent, Icon } from 'UI';
import { InfoCircleOutlined } from '@ant-design/icons';
import { mockData } from './__mock';
import { Segmented } from 'antd';
import { LongAnimationTask } from './type';
import Script from './Script'
import TaskTimeline from "./TaskTimeline";

interface Row extends LongAnimationTask {
  time: number;
}

function LongTaskPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState('all');
  const _list = React.useRef<VListHandle>(null);
  const { player, store } = React.useContext(PlayerContext);
  const [searchValue, setSearchValue] = React.useState('');

  const { currentTab, tabStates } = store.get();
  const longTasks = tabStates[currentTab]?.longTaskList || [];

  console.log('list', longTasks)
  const filteredList = useRegExListFilterMemo(
    longTasks,
    (task: LongAnimationTask) => [
      task.name,
      task.scripts.map((script) => script.name).join(','),
      task.scripts.map((script) => script.sourceURL).join(','),
    ],
    searchValue,
  )

  const onFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
  };

  const onRowClick = (time: number) => {
    player.jump(time);
  };

  const rows: Row[] = React.useMemo(() => {
    const rowMap = filteredList.map((task) => ({
      ...task,
      time: task.time ?? task.startTime,
    }))
    if (tab === 'blocking') {
      return rowMap.filter((task) => task.blockingDuration > 0);
    }
    return rowMap;
  }, [filteredList.length, tab]);

  const blockingTasks = rows.filter((task) => task.blockingDuration > 0);

  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <div className="flex items-center gap-2">
          <span className="font-semibold color-gray-medium mr-4">
            {t('Long Tasks')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Segmented
            size={'small'}
            value={tab}
            onChange={setTab}
            options={[
              { label: t('All'), value: 'all' },
              {
                label: (
                  <div>
                    {t('Blocking')} ({blockingTasks.length})
                  </div>
                ),
                value: 'blocking',
              },
            ]}
          />
          <Input.Search
            className="rounded-lg"
            placeholder={t('Filter by name or source URL')}
            name="filter"
            onChange={onFilterChange}
            value={searchValue}
            size="small"
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        <NoContent
          title={
            <div className="capitalize flex items-center gap-2">
              <InfoCircleOutlined size={18} />
              {t('No Data')}
            </div>
          }
          size="small"
          show={filteredList.length === 0}
        >
          <VList ref={_list} itemSize={25}>
            {rows.map((task) => (
              <LongTaskRow key={task.time} task={task} onJump={onRowClick} />
            ))}
          </VList>
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

function LongTaskRow({
  task,
  onJump,
}: {
  task: Row;
  onJump: (time: number) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className={
        'relative group hover:bg-active-blue cursor-pointer flex items-start gap-2 py-1 px-4 pe-8'
      }
      onClick={() => setExpanded(!expanded)}
    >
      <Icon
        name={expanded ? 'caret-down-fill' : 'caret-right-fill'}
        className={'mt-1'}
      />

      <div className="flex flex-col">
        <div className="flex flex-col">
          <TaskTitle entry={task} />
        </div>
        {expanded ? (
          <>
            <TaskTimeline task={task} />
            <div className={'flex items-center gap-1'}>
              <div className={'text-gray-dark'}>First UI event timestamp:</div>
              <div>{task.firstUIEventTimestamp.toFixed(2)} ms</div>
            </div>
            <div className={'text-gray-dark'}>Scripts:</div>
            <div className="flex flex-col gap-1 pl-2">
              {task.scripts.map((script, index) => (
                <Script script={script} key={index} />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <JumpButton time={task.time} onClick={() => onJump(task.time)} />
    </div>
  );
}

function TaskTitle({
  entry,
}: {
  entry: {
    name: string;
    duration: number;
    blockingDuration?: number;
  };
}) {
  const isBlocking =
    entry.blockingDuration !== undefined && entry.blockingDuration > 0;
  return (
    <div className={'flex items-center gap-1'}>
      <span>Long Animation Frame</span>
      <span className={'text-disabled-text'}>
        ({entry.duration.toFixed(2)} ms)
      </span>
      {isBlocking ? (
        <span className={'text-red'}>
          {entry.blockingDuration!.toFixed(2)} ms blocking
        </span>
      ) : null}
    </div>
  );
}

export default observer(LongTaskPanel);
