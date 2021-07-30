import { connect } from 'react-redux';
import cn from 'classnames';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from "react-virtualized";
import { TYPES } from 'Types/session/event';
import { setSelected } from 'Duck/events';
import { setEventFilter } from 'Duck/sessions';
import { show as showTargetDefiner } from 'Duck/components/targetDefiner';
import AutomateButton from './AutomateButton';
import UserCard from './UserCard';
import EventGroupWrapper from './EventGroupWrapper';
import styles from './eventsBlock.css';
import EventSearch from './EventSearch/EventSearch';

@connect(state => ({  
  session: state.getIn([ 'sessions', 'current' ]),
  filteredEvents: state.getIn([ 'sessions', 'filteredEvents' ]),
  eventsIndex: state.getIn([ 'sessions', 'eventsIndex' ]),
  selectedEvents: state.getIn([ 'events', 'selected' ]),
  targetDefinerDisplayed: state.getIn([ 'components', 'targetDefiner', 'isDisplayed' ]),
  testsAvaliable: false,  
}), {
  showTargetDefiner,
  setSelected,
  setEventFilter
})
export default class EventsBlock extends React.PureComponent {
  state = { 
    editingEvent: null,
    mouseOver: false,
    query: ''
  }

  scroller = React.createRef();
  cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 300
  });

  write = ({ target: { value, name } }) => { 
    const { filter } = this.state;
    this.setState({ query: value })
    this.props.setEventFilter({ query: value, filter })
    
    setTimeout(() => {      
      this.scroller.current.scrollToRow(0);   
      this.scroller.current.recomputeGridSize();
      this.scroller.current.recomputeRowHeights();
      this.scroller.current.forceUpdateGrid();
    }, 200)
  }

  clearSearch = () => {
    const { filter } = this.state;
    this.setState({ query: '' })
    this.props.setEventFilter({ query: '', filter })

    this.scroller.current.forceUpdateGrid();

    setTimeout(() => {      
      this.scroller.current.scrollToRow(0);      
    }, 100)    
  }

  onSetEventFilter = (e, { name, value }) => {
    const { query } = this.state;
    this.setState({ filter: value })
    this.props.setEventFilter({ filter: value, query });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.targetDefinerDisplayed && !this.props.targetDefinerDisplayed) {
      this.setState({ editingEvent: null });
    }
    if (prevProps.session !== this.props.session) { // Doesn't happen
      this.cache = new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 300
      });
    }
    if (prevProps.currentTimeEventIndex !== this.props.currentTimeEventIndex &&
        this.scroller.current !== null) {
      this.scroller.current.forceUpdateGrid();
      if (!this.state.mouseOver) {
        this.scroller.current.scrollToRow(this.props.currentTimeEventIndex);
      }
    }        
  }

  onCheckboxClick(e, event) {
    e.stopPropagation();
    const {
      session: { events },
      selectedEvents,
    } = this.props;

    this.props.player.pause();

    let newSelectedSet;
    const wasSelected = selectedEvents.contains(event);
    if (wasSelected) {
      newSelectedSet = selectedEvents.remove(event);
    } else {
      newSelectedSet = selectedEvents.add(event);
    }

    let selectNextLoad = false;
    events.reverse().forEach((sessEvent) => {
      if (sessEvent.type === TYPES.LOCATION) {
        if (selectNextLoad) {
          newSelectedSet = newSelectedSet.add(sessEvent);
        }
        selectNextLoad = false;
      } else if (newSelectedSet.contains(sessEvent)) {
        selectNextLoad = true;
      }
    });
    this.props.setSelected(newSelectedSet);
  }

  onEventClick = (e, event) => this.props.player.jump(event.time)

  onMouseOver = () => this.setState({ mouseOver: true })
  onMouseLeave = () => this.setState({ mouseOver: false })

  renderGroup = ({ index, key, style, parent }) => {
    const { 
      session: { events },
      selectedEvents,
      currentTimeEventIndex,
      testsAvaliable,
      playing,
      eventsIndex,
      filteredEvents
    } = this.props;     
    const _events = filteredEvents || events;
    const isLastEvent = index === _events.size - 1;
    const isLastInGroup = isLastEvent || _events.get(index + 1).type === TYPES.LOCATION;
    const event = _events.get(index);
    const isSelected = selectedEvents.includes(event);
    const isCurrent = index === currentTimeEventIndex;
    const isEditing = this.state.editingEvent === event;
    return (
      <CellMeasurer 
        key={key}
        cache={this.cache}
        parent={parent}        
        rowIndex={index}
      >
        {({measure, registerChild}) => (
          <div style={style} ref={registerChild}>
            <EventGroupWrapper              
              presentInSearch={eventsIndex.includes(index)}
              isFirst={index==0}
              mesureHeight={measure}
              onEventClick={ this.onEventClick }
              onCheckboxClick={ this.onCheckboxClick }
              event={ event }
              isLastEvent={ isLastEvent }
              isLastInGroup={ isLastInGroup }
              isSelected={ isSelected }
              isCurrent={ isCurrent }
              isEditing={ isEditing }
              showSelection={ testsAvaliable && !playing }
            />
          </div>
        )}
      </CellMeasurer>
    );
  }

  render() {
    const { query } = this.state;
    const {      
      testsAvaliable,
      session: {
        events,
        userNumericHash,
        userDisplayName,        
        userId,
        userAnonymousId
      },
      filteredEvents
    } = this.props;

    const _events = filteredEvents || events;

    return (
      <>
        <div className={ cn(styles.header, 'p-3') }>
          <UserCard
            className=""
            userNumericHash={userNumericHash}
            userDisplayName={userDisplayName}
            userId={userId}
            userAnonymousId={userAnonymousId}
          />

          <div className={ cn(styles.hAndProgress, 'mt-3') }>            
            <EventSearch
              onChange={this.write}
              clearSearch={this.clearSearch}
              value={query}
              header={
                <div className="text-lg">{ `User Events (${ events.size })` }</div>
              }
            />
          </div>          
        </div>
        <div 
          className={ cn("flex-1 px-3 pb-3", styles.eventsList) } 
          id="eventList" 
          data-openreplay-masked
          onMouseOver={ this.onMouseOver }
          onMouseLeave={ this.onMouseLeave }
        >
          <AutoSizer disableWidth>
            {({ height }) => (
              <List                
                ref={this.scroller}
                className={ styles.eventsList }
                height={height}
                width={248}
                overscanRowCount={6}
                itemSize={230}
                rowCount={_events.size}
                deferredMeasurementCache={this.cache}
                rowHeight={this.cache.rowHeight}
                rowRenderer={this.renderGroup}
                scrollToAlignment="start"                
              />
            )}
          </AutoSizer>
        </div>
        { testsAvaliable && <AutomateButton /> }
      </>
    );
  }
}
