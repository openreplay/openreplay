import { CloseOutlined } from '@ant-design/icons';
import { mergeEventLists, sortEvents } from 'Types/session';
import { TYPES } from 'Types/session/event';
import { Button, Tooltip } from 'antd';
import cn from 'classnames';
import { Search } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';

import { frameworkIcons, getDefaultFramework } from '../UnitStepsModal';
import EventGroupWrapper from './EventGroupWrapper';
import EventSearch from './EventSearch/EventSearch';
import styles from './eventsBlock.module.css';

interface IProps {
  setActiveTab: (tab?: string) => void;
}

const MODES = {
  SELECT: 'select',
  SEARCH: 'search',
  EXPORT: 'export',
};

function EventsBlock(props: IProps) {
  const defaultFramework = getDefaultFramework();
  const [mode, setMode] = React.useState(MODES.SELECT);
  const { t } = useTranslation();
  const { notesStore, uiPlayerStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const mixedEventsWithIssues = session.mixedEventsWithIssues;
  const incidents = session.incidents;
  const { filteredEvents } = sessionStore;
  const query = sessionStore.eventsQuery;
  const { eventsIndex } = sessionStore;
  const setEventFilter = sessionStore.setEventQuery;
  const [mouseOver, setMouseOver] = React.useState(false);
  const scroller = React.useRef<VListHandle>(null);
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { store, player } = React.useContext(PlayerContext);
  const [currentTimeEventIndex, setCurrentTimeEventIndex] = React.useState(0);
  const notes = notesStore.sessionNotes;

  const {
    time,
    endTime,
    playing,
    tabStates,
    tabChangeEvents = [],
  } = store.get();

  const filterOutNote = (id: any) => {
    notesStore.filterOutNote(id);
  };

  const { setActiveTab } = props;

  const filteredLength = filteredEvents?.length || 0;
  const eventListNow: any[] = [];
  if (tabStates !== undefined) {
    eventListNow.concat(Object.values(tabStates)[0]?.eventListNow || []);
  } else {
    eventListNow.concat(store.get().eventListNow);
  }

  const getEvents = () => {
    if (tabStates !== undefined) {
      tabChangeEvents.forEach((ev) => {
        const urlsList = tabStates[ev.tabId]?.urlsList || [];
        let found = false;
        let i = urlsList.length - 1;
        while (!found && i >= 0) {
          const item = urlsList[i];
          if (item.url && item.time <= ev.time) {
            found = true;
            ev.activeUrl = item.url.replace(/.*\/\/[^\/]*/, '');
          }
          i--;
        }
      });
    }

    const eventsWithMobxNotes = [
      ...(incidents ?? []),
      ...(mixedEventsWithIssues ?? []),
      ...(notes ?? []),
    ].sort(sortEvents);

    const allEvents = mergeEventLists(
      filteredLength > 0 ? filteredEvents : eventsWithMobxNotes,
      tabChangeEvents,
    );
    const filteredCombinedEvents: any[] = [];
    for (const e of allEvents) {
      let shouldAdd = true;
      if (zoomEnabled) {
        if ('time' in e) {
          if (e.time >= zoomStartTs && e.time <= zoomEndTs) {
            shouldAdd = true;
          } else {
            shouldAdd = false;
          }
        }
      }
      if (shouldAdd && uiPlayerStore.showOnlySearchEvents) {
        shouldAdd = 'isHighlighted' in e ? !!e.isHighlighted : false;
      }
      if (shouldAdd && 'type' in e && e.type === 'TABCHANGE') {
        shouldAdd = !!e.fromTab;
      }

      if (shouldAdd) {
        filteredCombinedEvents.push(e);
      }
    }
    return filteredCombinedEvents;
  };

  const usedEvents = React.useMemo(
    () => getEvents(),
    [
      query,
      filteredLength,
      mixedEventsWithIssues,
      notes,
      incidents,
      tabChangeEvents,
      uiPlayerStore.showOnlySearchEvents,
    ],
  );

  const findLastFitting = React.useCallback(
    (time: number) => {
      const allEvents = usedEvents.concat(incidents);
      if (!allEvents.length) return 0;
      let i = allEvents.length - 1;
      if (time > endTime / 2) {
        while (i > 0) {
          const event = allEvents[i];
          if ('time' in event && event.time <= time) break;
          i--;
        }
        return i;
      }
      let l = 0;
      while (l < i) {
        const event = allEvents[l];
        if ('time' in event && event.time >= time) break;
        l++;
      }
      return l;
    },
    [usedEvents, incidents, time, endTime],
  );

  useEffect(() => {
    setCurrentTimeEventIndex(findLastFitting(time));
  }, [time]);

  const write = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    setEventFilter({ query: value });

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToIndex(0);
    }, 100);
  };

  const clearSearch = () => {
    setEventFilter({ query: '' });

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToIndex(0);
    }, 100);
  };

  React.useEffect(
    () => () => {
      clearSearch();
    },
    [],
  );
  React.useEffect(() => {
    if (scroller.current) {
      if (!mouseOver) {
        scroller.current.scrollToIndex(currentTimeEventIndex, {
          align: 'center',
        });
      }
    }
  }, [currentTimeEventIndex]);

  const onEventClick = (_: React.MouseEvent, event: { time: number }) => {
    player.jump(event.time);
  };

  const onMouseOver = () => setMouseOver(true);
  const onMouseLeave = () => setMouseOver(false);

  const renderGroup = ({ index }: { index: number }) => {
    const isLastEvent = index === usedEvents.length - 1;
    const isLastInGroup =
      isLastEvent || usedEvents[index + 1]?.type === TYPES.LOCATION;
    const event = usedEvents[index];
    const isNote = 'noteId' in event;
    const isTabChange = 'type' in event && event.type === 'TABCHANGE';
    const isIncident = 'type' in event && event.type === 'INCIDENT';
    const isCurrent = index === currentTimeEventIndex;
    const isPrev = index < currentTimeEventIndex;
    const isSearched = event.isHighlighted;

    return (
      <EventGroupWrapper
        query={query}
        presentInSearch={eventsIndex.includes(index)}
        isFirst={index == 0}
        onEventClick={onEventClick}
        event={event}
        isLastEvent={isLastEvent}
        isLastInGroup={isLastInGroup}
        isCurrent={isCurrent}
        isSearched={isSearched}
        showSelection={!playing}
        isNote={isNote}
        isTabChange={isTabChange}
        isIncident={isIncident}
        isPrev={isPrev}
        filterOutNote={filterOutNote}
        setActiveTab={setActiveTab}
      />
    );
  };

  const isEmptySearch = query && (usedEvents.length === 0 || !usedEvents);
  return (
    <>
      <div
        className={cn(
          styles.header,
          'py-4 px-2 bg-linear-to-t from-transparent to-neutral-gray-lightest h-[57px]',
        )}
      >
        {mode === MODES.SELECT ? (
          <div className={'flex items-center gap-2'}>
            <Button
              onClick={() => setActiveTab('EXPORT')}
              type={'default'}
              shape={'circle'}
            >
              {frameworkIcons[defaultFramework]}
            </Button>
            <Button
              className={'flex items-center gap-2'}
              onClick={() => setMode(MODES.SEARCH)}
            >
              <Search size={14} />
              <div>
                {t('Search')}&nbsp;{usedEvents.length}&nbsp;{t('events')}
              </div>
            </Button>
            <Tooltip title={t('Close Panel')} placement="bottom">
              <Button
                className="ml-auto"
                type="text"
                onClick={() => {
                  setActiveTab('');
                }}
                icon={<CloseOutlined />}
              />
            </Tooltip>
          </div>
        ) : null}
        {mode === MODES.SEARCH ? (
          <div className={'flex items-center gap-2'}>
            <EventSearch
              onChange={write}
              setActiveTab={setActiveTab}
              value={query}
              eventsText={
                usedEvents.length
                  ? `${usedEvents.length} ${t('Events')}`
                  : `0 ${t('Events')}`
              }
            />
            <Button type={'text'} onClick={() => setMode(MODES.SELECT)}>
              {t('Cancel')}
            </Button>
          </div>
        ) : null}
      </div>
      <div
        className={cn('flex-1 pb-4', styles.eventsList)}
        id="eventList"
        data-openreplay-masked
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {isEmptySearch && (
          <div className="flex items-center p-4">
            <Icon name="binoculars" size={18} />
            <span className="ml-2">{t('No Matching Results')}</span>
          </div>
        )}
        <VList data={usedEvents} className={styles.eventsList} ref={scroller}>
          {(_, i) => {
            return renderGroup({ index: i });
          }}
        </VList>
      </div>
    </>
  );
}

export default observer(EventsBlock);
