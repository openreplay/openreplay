import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { Icon } from 'UI';
import { List, AutoSizer, CellMeasurer } from "react-virtualized";
import { TYPES } from 'Types/session/event';
import { setEventFilter, filterOutNote } from 'Duck/sessions';
import { show as showTargetDefiner } from 'Duck/components/targetDefiner';
import EventGroupWrapper from './EventGroupWrapper';
import styles from './eventsBlock.module.css';
import EventSearch from './EventSearch/EventSearch';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { RootStore } from 'App/duck'
import { List as ImmList } from 'immutable'
import useCellMeasurerCache from 'Components/shared/DevTools/useCellMeasurerCache'

interface IProps {
  setEventFilter: (filter: { query: string }) => void
  filteredEvents: ImmList<Record<string, any>>
  setActiveTab: (tab?: string) => void
  query: string
  session: Record<string, any>
  filterOutNote: (id: string) => void
  eventsIndex: number[]
}

function EventsBlock(props: IProps) {
  const [mouseOver, setMouseOver] = React.useState(true)
  const scroller = React.useRef<List>(null)
  const cache = useCellMeasurerCache(undefined, {
    fixedWidth: true,
    defaultHeight: 300
  });

  const { store, player } = React.useContext(PlayerContext)

  const { eventListNow, playing } = store.get()

  const { session: { events, notesWithEvents }, filteredEvents,
    eventsIndex,
    filterOutNote,
    query,
    setActiveTab,
  } = props
  const currentTimeEventIndex = eventListNow.length > 0 ? eventListNow.length - 1 : 0
  const usedEvents = filteredEvents || notesWithEvents

  const write = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    props.setEventFilter({ query: value })

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToRow(0);
    }, 100)
  }

  const clearSearch = () => {
    props.setEventFilter({ query: '' })
    if (scroller.current) {
      scroller.current.forceUpdateGrid();
    }

    setTimeout(() => {
      if (!scroller.current) return;

      scroller.current.scrollToRow(0);
    }, 100)
  }
  
  React.useEffect(() => {
    return () => {
      clearSearch()
    }
  }, [])
  React.useEffect(() => {
    if (scroller.current) {
      scroller.current.forceUpdateGrid();
      if (!mouseOver) {
        scroller.current.scrollToRow(currentTimeEventIndex);
      }
    }
  }, [currentTimeEventIndex])

  const onEventClick = (_: React.MouseEvent, event: { time: number }) => player.jump(event.time)
  const onMouseOver = () => setMouseOver(true)
  const onMouseLeave = () => setMouseOver(false)

  const renderGroup = ({ index, key, style, parent }: { index: number; key: string; style: React.CSSProperties; parent: any }) => {
    const isLastEvent = index === usedEvents.size - 1;
    const isLastInGroup = isLastEvent || usedEvents.get(index + 1)?.type === TYPES.LOCATION;
    const event = usedEvents.get(index);
    const isNote = !!event?.noteId
    const isCurrent = index === currentTimeEventIndex;

    const heightBug = index === 0 && event?.type === TYPES.LOCATION && event.referrer ? { top: 2 } : {}
    return (
      <CellMeasurer
        key={key}
        cache={cache}
        parent={parent}
        rowIndex={index}
      >
        {({measure, registerChild}) => (
          <div style={{ ...style, ...heightBug }} ref={registerChild}>
            <EventGroupWrapper
              query={query}
              presentInSearch={eventsIndex.includes(index)}
              isFirst={index==0}
              mesureHeight={measure}
              onEventClick={ onEventClick }
              event={ event }
              isLastEvent={ isLastEvent }
              isLastInGroup={ isLastInGroup }
              isCurrent={ isCurrent }
              showSelection={ !playing }
              isNote={isNote}
              filterOutNote={filterOutNote}
            />
          </div>
        )}
      </CellMeasurer>
    );
  }

  const isEmptySearch = query && (usedEvents.size === 0 || !usedEvents)
  return (
    <>
      <div className={ cn(styles.header, 'p-4') }>
        <div className={ cn(styles.hAndProgress, 'mt-3') }>
          <EventSearch
            onChange={write}
            setActiveTab={setActiveTab}
            value={query}
            header={
              <div className="text-xl">User Steps <span className="color-gray-medium">{ events.size }</span></div>
            }
          />
        </div>
      </div>
      <div
        className={ cn("flex-1 px-4 pb-4", styles.eventsList) }
        id="eventList"
        data-openreplay-masked
        onMouseOver={ onMouseOver }
        onMouseLeave={ onMouseLeave }
      >
        {isEmptySearch && (
          <div className='flex items-center'>
            <Icon name="binoculars" size={18} />
            <span className='ml-2'>No Matching Results</span>
          </div>
        )}
        <AutoSizer disableWidth>
          {({ height }) => (
            <List
              ref={scroller}
              className={ styles.eventsList }
              height={height + 10}
              width={248}
              overscanRowCount={6}
              itemSize={230}
              rowCount={usedEvents.size}
              deferredMeasurementCache={cache}
              rowHeight={cache.rowHeight}
              rowRenderer={renderGroup}
              scrollToAlignment="start"
            />
          )}
        </AutoSizer>
      </div>
    </>
  );
}

export default connect((state: RootStore) => ({
  session: state.getIn([ 'sessions', 'current' ]),
  filteredEvents: state.getIn([ 'sessions', 'filteredEvents' ]),
  query: state.getIn(['sessions', 'eventsQuery']),
  eventsIndex: state.getIn([ 'sessions', 'eventsIndex' ]),
  targetDefinerDisplayed: state.getIn([ 'components', 'targetDefiner', 'isDisplayed' ]),
}), {
  showTargetDefiner,
  setEventFilter,
  filterOutNote
})(observer(EventsBlock))
