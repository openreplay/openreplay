import Session, { mergeEventLists, sortEvents } from 'Types/session';
import { TYPES } from 'Types/session/event';
import { InjectedEvent } from 'Types/session/event';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { VList, VListHandle } from 'virtua';

import { PlayerContext } from 'App/components/Session/playerContext';
import { RootStore } from 'App/duck';
import { useStore } from 'App/mstore';
import { filterOutNote, setEventFilter } from 'Duck/sessions';
import { Icon } from 'UI';

import EventGroupWrapper from './EventGroupWrapper';
import EventSearch from './EventSearch/EventSearch';
import styles from './eventsBlock.module.css';

interface IProps {
  setEventFilter: (filter: { query: string }) => void;
  filteredEvents: InjectedEvent[];
  setActiveTab: (tab?: string) => void;
  query: string;
  events: Session['events'];
  notesWithEvents: Session['notesWithEvents'];
  filterOutNote: (id: string) => void;
  eventsIndex: number[];
  uxtVideo: string;
  zoomEnabled: boolean;
  zoomStartTs: number;
  zoomEndTs: number;
}

function EventsBlock(props: IProps) {
  const { notesStore, uxtestingStore } = useStore();
  const [mouseOver, setMouseOver] = React.useState(false);
  const scroller = React.useRef<VListHandle>(null);

  const { store, player } = React.useContext(PlayerContext);

  const {
    time,
    endTime,
    playing,
    tabStates,
    tabChangeEvents = [],
  } = store.get();

  const {
    filteredEvents,
    eventsIndex,
    filterOutNote,
    query,
    setActiveTab,
    notesWithEvents = [],
  } = props;
  const notes = notesStore.sessionNotes;

  const filteredLength = filteredEvents?.length || 0;
  const notesWithEvtsLength = notesWithEvents?.length || 0;
  const notesLength = notes.length;
  const eventListNow: any[] = [];
  if (tabStates !== undefined) {
    eventListNow.concat(Object.values(tabStates)[0]?.eventListNow || []);
  } else {
    eventListNow.concat(store.get().eventListNow);
  }

  const usedEvents = React.useMemo(() => {
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
    const eventsWithMobxNotes = [...notesWithEvents, ...notes].sort(sortEvents);
    return mergeEventLists(
      filteredLength > 0 ? filteredEvents : eventsWithMobxNotes,
      tabChangeEvents
    ).filter((e) =>
      props.zoomEnabled
        ? 'time' in e
          ? e.time >= props.zoomStartTs && e.time <= props.zoomEndTs
          : false
        : true
    );
  }, [
    filteredLength,
    notesWithEvtsLength,
    notesLength,
    props.zoomEnabled,
    props.zoomStartTs,
    props.zoomEndTs,
  ]);
  const findLastFitting = React.useCallback(
    (time: number) => {
      if (!usedEvents.length) return 0;
      let i = usedEvents.length - 1;
      if (time > endTime / 2) {
        while (i >= 0) {
          const event = usedEvents[i];
          if ('time' in event && event.time <= time) break;
          i--;
        }
        return i;
      } else {
        let l = 0;
        while (l < i) {
          const event = usedEvents[l];
          if ('time' in event && event.time >= time) break;
          l++;
        }
        return l;
      }
    },
    [usedEvents, time, endTime]
  );
  const currentTimeEventIndex = findLastFitting(time);

  const write = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    props.setEventFilter({ query: value });

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToIndex(0);
    }, 100);
  };

  const clearSearch = () => {
    props.setEventFilter({ query: '' });

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToIndex(0);
    }, 100);
  };

  React.useEffect(() => {
    return () => {
      clearSearch();
    };
  }, []);
  React.useEffect(() => {
    if (scroller.current) {
      if (!mouseOver) {
        console.log('scrolling to index', currentTimeEventIndex, scroller.current);
        scroller.current.scrollToIndex(currentTimeEventIndex, { align: 'center' });
      }
    }
  }, [currentTimeEventIndex]);

  const onEventClick = (_: React.MouseEvent, event: { time: number }) => {
    player.jump(event.time);
    props.setEventFilter({ query: '' });
  };
  const onMouseOver = () => setMouseOver(true);
  const onMouseLeave = () => setMouseOver(false);

  const renderGroup = ({
    index,
  }: {
    index: number;
  }) => {
    const isLastEvent = index === usedEvents.length - 1;
    const isLastInGroup =
      isLastEvent || usedEvents[index + 1]?.type === TYPES.LOCATION;
    const event = usedEvents[index];
    const isNote = 'noteId' in event;
    const isTabChange = 'type' in event && event.type === 'TABCHANGE';
    const isCurrent = index === currentTimeEventIndex;
    const isPrev = index < currentTimeEventIndex;
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
        showSelection={!playing}
        isNote={isNote}
        isTabChange={isTabChange}
        isPrev={isPrev}
        filterOutNote={filterOutNote}
      />
    );
  };

  const isEmptySearch = query && (usedEvents.length === 0 || !usedEvents);
  const eventsText = `${query ? 'Filtered' : ''} ${usedEvents.length} Events`;

  return (
    <>
      <div className={cn(styles.header, 'p-4')}>
        {uxtestingStore.isUxt() ? (
          <div style={{ width: 240, height: 130 }} className={'relative'}>
            <video
              className={'z-20 fixed'}
              muted
              autoPlay
              controls
              src={props.uxtVideo}
              width={240}
            />
            <div
              style={{
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              className={'absolute z-10'}
            >
              No video
            </div>
          </div>
        ) : null}
        <div className={cn(styles.hAndProgress, 'mt-3')}>
          <EventSearch
            onChange={write}
            setActiveTab={setActiveTab}
            value={query}
          />
        </div>
        <div className="mt-1 color-gray-medium">{eventsText}</div>
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
            <span className="ml-2">No Matching Results</span>
          </div>
        )}
        <VList
          count={usedEvents.length}
          className={styles.eventsList}
          ref={scroller}
        >
          {usedEvents.map((_, i) => {
              return renderGroup({ index: i })
            }
          )}
        </VList>
      </div>
    </>
  );
}

export default connect(
  (state: RootStore) => ({
    session: state.getIn(['sessions', 'current']),
    notesWithEvents: state.getIn(['sessions', 'current']).notesWithEvents,
    events: state.getIn(['sessions', 'current']).events,
    uxtVideo: state.getIn(['sessions', 'current']).uxtVideo,
    filteredEvents: state.getIn(['sessions', 'filteredEvents']),
    query: state.getIn(['sessions', 'eventsQuery']),
    eventsIndex: state.getIn(['sessions', 'eventsIndex']),
    zoomEnabled: state.getIn(['components', 'player']).timelineZoom.enabled,
    zoomStartTs: state.getIn(['components', 'player']).timelineZoom.startTs,
    zoomEndTs: state.getIn(['components', 'player']).timelineZoom.endTs,
  }),
  {
    setEventFilter,
    filterOutNote,
  }
)(observer(EventsBlock));
