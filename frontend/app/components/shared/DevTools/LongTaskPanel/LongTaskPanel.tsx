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
import { Segmented, Select, Tag } from 'antd';
import { LongAnimationTask } from './type';
import Script from './Script';
import TaskTimeline from './TaskTimeline';
import { Hourglass } from 'lucide-react';

interface Row extends LongAnimationTask {
  time: number;
}

const TABS = {
  all: 'all',
  blocking: 'blocking',
};

const SORT_BY = {
  timeAsc: 'timeAsc',
  blocking: 'blockingDesc',
  duration: 'durationDesc',
};

function LongTaskPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState(TABS.all);
  const [sortBy, setSortBy] = React.useState(SORT_BY.timeAsc);
  const _list = React.useRef<VListHandle>(null);
  const { player, store } = React.useContext(PlayerContext);
  const [searchValue, setSearchValue] = React.useState('');

  const { currentTab, tabStates } = store.get();
  const longTasks = tabStates[currentTab]?.laTaskList || [];

  const filteredList = useRegExListFilterMemo(
    longTasks,
    (task: LongAnimationTask) => [
      task.name,
      task.scripts.map((script) => script.name).join(','),
      task.scripts.map((script) => script.sourceURL).join(','),
    ],
    searchValue,
  );

  const onFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
  };

  const onRowClick = (time: number) => {
    player.jump(time);
  };

  const rows: Row[] = React.useMemo(() => {
    let rowMap = filteredList.map((task) => ({
      ...task,
      time: task.time ?? task.startTime,
    }));
    if (tab === 'blocking') {
      rowMap = rowMap.filter((task) => task.blockingDuration > 0);
    }
    switch (sortBy) {
      case SORT_BY.blocking:
        rowMap = rowMap.sort((a, b) => b.blockingDuration - a.blockingDuration);
        break;
      case SORT_BY.duration:
        rowMap = rowMap.sort((a, b) => b.duration - a.duration);
        break;
      default:
        rowMap = rowMap.sort((a, b) => a.time - b.time);
    }
    return rowMap;
  }, [filteredList.length, tab, sortBy]);

  const blockingTasks = React.useMemo(() => {
    let blockingAmount = 0;
    for (const task of longTasks) {
      if (task.blockingDuration > 0) {
        blockingAmount++;
      }
    }
    return blockingAmount;
  }, [longTasks.length]);

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
                    {t('Blocking')} ({blockingTasks})
                  </div>
                ),
                value: 'blocking',
              },
            ]}
          />
          <Select
            size="small"
            className="rounded-lg"
            value={sortBy}
            onChange={setSortBy}
            popupMatchSelectWidth={150}
            dropdownStyle={{ minWidth: '150px' }}
            options={[
              { label: t('Default Order'), value: 'timeAsc' },
              { label: t('Blocking Duration'), value: 'blockingDesc' },
              { label: t('Task Duration'), value: 'durationDesc' },
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
          <VList ref={_list} itemSize={25} data={rows}>
            {(task) => (
              <LongTaskRow
                key={task.key ?? task.startTime}
                task={task}
                onJump={onRowClick}
              />
            )}
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
        'relative border-b border-gray-lighter group hover:bg-active-blue py-1 px-4 pe-8'
      }
    >
      <div className="flex flex-col w-full">
        <TaskTitle
          expanded={expanded}
          entry={task}
          toggleExpand={() => setExpanded(!expanded)}
        />
        {expanded ? (
          <>
            <TaskTimeline task={task} />
            <div className={'flex items-center gap-1 mb-2'}>
              <div className={'text-black font-medium'}>
                First UI event timestamp:
              </div>
              <div className="color-gray-medium font-mono block">
                {Math.round(task.firstUIEventTimestamp)} ms
              </div>
            </div>
            <div className={'text-black font-medium'}>Scripts:</div>
            <div className="flex flex-col gap-1">
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
  toggleExpand,
  expanded,
}: {
  entry: {
    name: string;
    duration: number;
    blockingDuration?: number;
    scripts: LongAnimationTask['scripts'];
  };
  expanded: boolean;
  toggleExpand: () => void;
}) {
  const isBlocking =
    entry.blockingDuration !== undefined && entry.blockingDuration > 0;

  const scriptTitles = entry.scripts.map((script) =>
    script.invokerType ? script.invokerType : script.name,
  );
  const { title, plusMore } = getFirstTwoScripts(scriptTitles);
  return (
    <div
      className={'flex items-center gap-1 text-sm cursor-pointer'}
      onClick={toggleExpand}
    >
      <Icon name={expanded ? 'caret-down-fill' : 'caret-right-fill'} />
      <span className="font-mono font-bold">{title}</span>
      <Tag color="default" variant="filled">
        {plusMore}
      </Tag>
      <span className={'color-gray-medium font-mono'}>
        {Math.round(entry.duration)} ms
      </span>
      {isBlocking ? (
        <Tag
          variant="filled"
          color="red"
          className="font-mono rounded-lg text-xs flex gap-1 items-center color-red"
        >
          <Hourglass size={11} /> {Math.round(entry.blockingDuration!)} ms
          blocking
        </Tag>
      ) : null}
    </div>
  );
}

function getFirstTwoScripts(titles: string[]) {
  if (titles.length === 0) {
    return { title: 'Long Animation Task', plusMore: null };
  }
  const additional = titles.length - 2;
  const additionalStr = additional > 0 ? `+ ${additional} more` : null;
  return {
    title: `${titles[0]}${titles[1] ? `, ${titles[1]}` : ''}`,
    plusMore: additionalStr,
  };
}

export default observer(LongTaskPanel);
