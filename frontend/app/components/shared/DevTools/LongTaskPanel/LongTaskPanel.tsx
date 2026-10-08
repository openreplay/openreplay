import { InlineSelect } from '@/ui/inputs/select';
import { ChevronRight, Hourglass } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import { PlayerContext } from 'App/components/Session/playerContext';

import BottomBlock from '../BottomBlock';
import JumpButton from '../JumpButton';
import { Keyword, NoData, PanelTabs } from '../PanelKit';
import { useRegExListFilterMemo } from '../useListFilter';
import Script from './Script';
import TaskTimeline from './TaskTimeline';
import { LongAnimationTask } from './type';

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
        <PanelTabs
          label={t('Long tasks')}
          active={tab}
          onSelect={(v) => setTab(v as typeof tab)}
          items={[
            { key: 'all', label: t('All'), count: longTasks.length },
            { key: 'blocking', label: t('Blocking'), count: blockingTasks },
          ]}
        />
        <div className="m-dt__bar-right">
          <InlineSelect
            ariaLabel={t('Sort tasks')}
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: t('Default order'), value: 'timeAsc' },
              { label: t('Blocking duration'), value: 'blockingDesc' },
              { label: t('Task duration'), value: 'durationDesc' },
            ]}
          />
          <Keyword
            value={searchValue}
            onChange={setSearchValue}
            placeholder={t('Filter by name or source URL')}
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filteredList.length === 0 ? (
          <NoData hint={t('No long animation frames were recorded.')} />
        ) : (
          <VList ref={_list} itemSize={25} data={rows}>
            {(task) => (
              <LongTaskRow
                key={task.key ?? task.startTime}
                task={task}
                onJump={onRowClick}
              />
            )}
          </VList>
        )}
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
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="m-dt__row m-dt__task has-tail group">
      <div className="flex flex-col w-full">
        <TaskTitle
          expanded={expanded}
          entry={task}
          toggleExpand={() => setExpanded(!expanded)}
        />
        {expanded ? (
          <>
            <TaskTimeline task={task} />
            <p className="m-dt__task-fact">
              {t('First UI event timestamp:')}{' '}
              <span className="m-mono">
                {Math.round(task.firstUIEventTimestamp)} ms
              </span>
            </p>
            <p className="m-dt__task-fact">{t('Scripts:')}</p>
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
  const { t } = useTranslation();
  const isBlocking =
    entry.blockingDuration !== undefined && entry.blockingDuration > 0;

  const scriptTitles = entry.scripts.map((script) =>
    script.invokerType ? script.invokerType : script.name,
  );
  const { title, plusMore } = getFirstTwoScripts(scriptTitles);
  return (
    <div className="m-dt__task-title" onClick={toggleExpand}>
      <span className="m-dt__rowopen" aria-expanded={expanded}>
        <ChevronRight size={11} />
      </span>
      <span className="m-mono m-dt__task-name">{title}</span>
      {plusMore ? <span className="m-dt__chip">{plusMore}</span> : null}
      <span className="m-mono m-dt__task-ms">
        {Math.round(entry.duration)} ms
      </span>
      {isBlocking ? (
        <span className="m-dt__chip is-bad m-mono">
          <Hourglass size={11} /> {Math.round(entry.blockingDuration!)} ms{' '}
          {t('blocking')}
        </span>
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
