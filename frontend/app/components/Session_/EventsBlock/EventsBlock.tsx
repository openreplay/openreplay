import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { Icon } from 'UI';
import { List, AutoSizer, CellMeasurer } from 'react-virtualized';
import { TYPES } from 'Types/session/event';
import { setEventFilter, filterOutNote } from 'Duck/sessions';
import EventGroupWrapper from './EventGroupWrapper';
import styles from './eventsBlock.module.css';
import EventSearch from './EventSearch/EventSearch';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { RootStore } from 'App/duck';
import useCellMeasurerCache from 'App/hooks/useCellMeasurerCache';
import { InjectedEvent } from 'Types/session/event';
import Session, { mergeEventLists, sortEvents } from 'Types/session';
import { useStore } from 'App/mstore';

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
}

function EventsBlock(props: IProps) {
  const { notesStore, uxtestingStore } = useStore();
  const [mouseOver, setMouseOver] = React.useState(true);
  const scroller = React.useRef<List>(null);
  const cache = useCellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 300,
  });

  const { store, player } = React.useContext(PlayerContext);

  const { playing, tabStates, tabChangeEvents = [] } = store.get();

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

  const currentTimeEventIndex = eventListNow.length > 0 ? eventListNow.length - 1 : 0;
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
    );
  }, [filteredLength, notesWithEvtsLength, notesLength]);

  const write = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    props.setEventFilter({ query: value });

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToRow(0);
    }, 100);
  };

  const clearSearch = () => {
    props.setEventFilter({ query: '' });
    if (scroller.current) {
      scroller.current.forceUpdateGrid();
    }

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToRow(0);
    }, 100);
  };

  React.useEffect(() => {
    return () => {
      clearSearch();
    };
  }, []);
  React.useEffect(() => {
    if (scroller.current) {
      scroller.current.forceUpdateGrid();
      if (!mouseOver) {
        scroller.current.scrollToRow(currentTimeEventIndex);
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
    key,
    style,
    parent,
  }: {
    index: number;
    key: string;
    style: React.CSSProperties;
    parent: any;
  }) => {
    const isLastEvent = index === usedEvents.length - 1;
    const isLastInGroup = isLastEvent || usedEvents[index + 1]?.type === TYPES.LOCATION;
    const event = usedEvents[index];
    const isNote = 'noteId' in event;
    const isTabChange = 'type' in event && event.type === 'TABCHANGE';
    const isCurrent = index === currentTimeEventIndex;

    return (
      <CellMeasurer key={key} cache={cache} parent={parent} rowIndex={index}>
        {({ measure, registerChild }) => (
          <div style={{ ...style }} ref={registerChild}>
            <EventGroupWrapper
              query={query}
              presentInSearch={eventsIndex.includes(index)}
              isFirst={index == 0}
              mesureHeight={measure}
              onEventClick={onEventClick}
              event={event}
              isLastEvent={isLastEvent}
              isLastInGroup={isLastInGroup}
              isCurrent={isCurrent}
              showSelection={!playing}
              isNote={isNote}
              isTabChange={isTabChange}
              filterOutNote={filterOutNote}
            />
          </div>
        )}
      </CellMeasurer>
    );
  };

  const isEmptySearch = query && (usedEvents.length === 0 || !usedEvents);
  const eventsText = `${query ? 'Filtered' : ''} ${usedEvents.length} Events`;

  return (
    <>
      <div className={cn(styles.header, 'p-4')}>
        {uxtestingStore.isUxt() ? (
          <div style={{ width: 240, height: 130 }} className={'relative'}>
            <video className={'z-20 fixed'} muted autoPlay controls src={props.uxtVideo} width={240} />
            <div style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }} className={'absolute z-10'}>No video</div>
          </div>
        ) : null}
        <div className={cn(styles.hAndProgress, 'mt-3')}>
          <EventSearch onChange={write} setActiveTab={setActiveTab} value={query} />
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
        <AutoSizer disableWidth>
          {({ height }) => (
            <List
              ref={scroller}
              className={styles.eventsList}
              height={height + 10}
              width={270}
              overscanRowCount={6}
              itemSize={230}
              rowCount={usedEvents.length}
              deferredMeasurementCache={cache}
              rowHeight={cache.rowHeight}
              rowRenderer={renderGroup}
              scrollToAlignment="center"
            />
          )}
        </AutoSizer>
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
  }),
  {
    setEventFilter,
    filterOutNote,
  }
)(observer(EventsBlock));
