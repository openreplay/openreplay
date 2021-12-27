import { DateTime } from 'luxon';
import { connect } from 'react-redux';
import cn from 'classnames';
import { connectPlayer } from 'Player';
import { Popup, TimelinePointer } from 'UI';
import TimeTracker from './TimeTracker';
import { ReduxTime } from './Time';
import stl from './timeline.css';
import { TYPES } from 'Types/session/event';
import { setTimelinePointer } from 'Duck/sessions';

const getPointerIcon = (type) => {
  // exception, 
  switch(type) {
    case 'fetch':
      return 'funnel/file-earmark-minus-fill';
    case 'exception':
      return 'funnel/exclamation-circle';
    case 'log':
      return 'funnel/exclamation-circle';
    case 'stack':
      return 'funnel/patch-exclamation-fill';
    case 'resource':
      return 'funnel/file-medical-alt';

    case 'dead_click':
      return 'funnel/dizzy';
    case 'click_rage':
      return 'funnel/dizzy';
    case 'excessive_scrolling':
      return 'funnel/mouse';
    case 'bad_request':
      return 'funnel/file-medical-alt';
    case 'missing_resource':
      return 'funnel/file-earmark-minus-fill';
    case 'memory':
      return 'funnel/sd-card';
    case 'cpu':
      return 'funnel/microchip';
    case 'slow_resource':
      return 'funnel/hourglass-top';
    case 'slow_page_load':
      return 'funnel/hourglass-top';
    case 'crash':
      return 'funnel/file-exclamation';
    case 'js_exception':
      return 'funnel/exclamation-circle';
  }

  return 'info';    
}

@connectPlayer(state => ({
  skipIntervals: state.skipIntervals,
  events: state.eventList,
  skip: state.skip,
  skipToIssue: state.skipToIssue,
  disabled: state.cssLoading || state.messagesLoading || state.markedTargets,
  endTime: state.endTime,
  live: state.live,
  logList: state.logList,
  exceptionsList: state.exceptionsList,
  resourceList: state.resourceList,
  stackList: state.stackList,
  fetchList: state.fetchList,
}))
@connect(state => ({
  issues: state.getIn([ 'sessions', 'current', 'issues' ]),  
  clickRageTime: state.getIn([ 'sessions', 'current', 'clickRage' ]) &&
    state.getIn([ 'sessions', 'current', 'clickRageTime' ]),
  returningLocationTime: state.getIn([ 'sessions', 'current', 'returningLocation' ]) &&
    state.getIn([ 'sessions', 'current', 'returningLocationTime' ]),
}), { setTimelinePointer })
export default class Timeline extends React.PureComponent {
  seekProgress = (e) => {
    const { endTime } = this.props;
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    this.props.jump(time);
  }

  createEventClickHandler = pointer => (e) => {
    e.stopPropagation();
    this.props.jump(pointer.time);
    this.props.setTimelinePointer(pointer);
  }

  componentDidMount() {
    const { issues, events, fetchList, skipToIssue } = this.props;
    const firstIssue = issues.get(0);
    if (firstIssue && skipToIssue) {
      this.props.jump(firstIssue.time);
    }
  }

  render() {
    const {
      events,
      skip,
      skipIntervals,
      disabled,
      endTime,
      live,
      logList,
      exceptionsList,
      resourceList,      
      clickRageTime,
      stackList,
      fetchList,
      issues
    } = this.props;

    const scale = 100 / endTime;
    return (
      <div 
        className={ cn("flex items-center") }
      >
        { !live && <ReduxTime name="time" /> }
        <div className={ stl.progress } onClick={ disabled ? null : this.seekProgress }>
            <TimeTracker scale={ scale } />
            { skip && skipIntervals.map(interval =>
              (<div
                key={ interval.start }
                className={ stl.skipInterval }
                style={ {
                  left: `${ interval.start * scale }%`,
                  width: `${ (interval.end - interval.start) * scale }%`,
                } }
              />))
            }
            <div className={ stl.timeline }/>
            { events.map(e => (
              <div
                key={ e.key }
                className={ stl.event }
                style={ { left: `${ e.time * scale }%` } }
              />
              ))
            }
            {
              issues.map(iss => (
                <div 
                  style={ { 
                    left: `${ iss.time * scale }%`,
                    top: '-30px'
                    //width: `${ 2000 * scale }%`
                  } } 
                  className={ stl.clickRage }
                  onClick={ this.createEventClickHandler(iss) }
                >
                  <TimelinePointer
                    icon={iss.icon}
                    content={
                      <div className={ stl.popup }>
                        <b>{ iss.name }</b>
                      </div> 
                    } 
                  />
                </div>
              ))
            }
            { events.filter(e => e.type === TYPES.CLICKRAGE).map(e => (
              <div 
                style={ { 
                  left: `${ e.time * scale }%`,
                  top: '-30px'
                  //width: `${ 2000 * scale }%`
                } } 
                className={ stl.clickRage }
                onClick={ this.createEventClickHandler(e) }
              >
                <TimelinePointer
                  icon={getPointerIcon('click_rage')}
                  content={
                    <div className={ stl.popup }>
                      <b>{ "Click Rage" }</b>
                    </div> 
                  } 
                />
              </div>
              // <Popup
              //   pinned
              //   offset="-19"
              //   trigger={
              //     <div 
              //       style={ { 
              //         left: `${ e.time * scale }%`,
              //         //width: `${ 2000 * scale }%`
              //       } } 
              //       className={ stl.clickRage }
              //     />
              //   }
              //   content={ 
              //     <div className={ stl.popup }>
              //       <b>{ "Click Rage" }</b>
              //     </div> 
              //   }
              // />
            ))}
            { typeof clickRageTime === 'number' &&
              <div 
                style={ { 
                  left: `${ clickRageTime * scale }%`,
                  top: '-30px'
                  //width: `${ 2000 * scale }%`
                } } 
                className={ stl.clickRage }
              >
                <TimelinePointer
                  icon={getPointerIcon('click_rage')}
                  content={
                    <div className={ stl.popup }>
                      <b>{ "Click Rage" }</b>
                    </div> 
                  } 
                />
              </div>
              // <Popup
              //   pinned
              //   offset="-19"
              //   trigger={
              //     <div 
              //       style={ { 
              //         left: `${ clickRageTime * scale }%`,
              //         //width: `${ 2000 * scale }%`
              //       } } 
              //       className={ stl.clickRage }
              //     />
              //   }
              //   content={ 
              //     <div className={ stl.popup }>
              //       <b>{ "Click Rage" }</b>
              //     </div> 
              //   }
              // />
            }
            { /* typeof returningLocationTime === 'number' &&
              <Popup
                pinned
                offset="-19"
                trigger={
                  <div 
                    style={ { 
                      left: `${ returningLocationTime * scale }%`,
                      //width: `${ 2000 * scale }%`
                    } } 
                    className={ stl.returningLocation }
                    onClick={ this.createEventClickHandler(returningLocationTime) }
                  />
                }
                content={ 
                  <div className={ stl.popup }>
                    <b>{ "Returning Location" }</b>
                  </div> 
                }
              />
             */ }
            { exceptionsList
              .map(e => (
                <div
                  key={ e.key }
                  className={ cn(stl.markup, stl.error) }
                  style={ { left: `${ e.time * scale }%`, top: '-30px' } }
                  onClick={ this.createEventClickHandler(e) }
                >
                  <TimelinePointer
                    icon={getPointerIcon('exception')}
                    content={ 
                      <div className={ stl.popup } >
                        <b>{ "Exception" }</b>
                        <br/>
                        <span>{ e.message }</span>
                      </div>  
                    }
                  />
                </div>
                // <Popup
                //   key={ e.key }
                //   offset="-19"
                //   pinned
                //   className="error"
                //   trigger={
                //     <div
                //       key={ e.key }
                //       className={ cn(stl.markup, stl.error) }
                //       style={ { left: `${ e.time * scale }%` } }
                //       onClick={ this.createEventClickHandler(e.time) }
                //     />
                //   }
                //   content={ 
                //     <div className={ stl.popup } >
                //       <b>{ "Exception:" }</b>
                //       <br/>
                //       <span>{ e.message }</span>
                //     </div>  
                //   }
                // />
              ))
            }
            { logList
              .map(l => l.isRed() && (
                <div
                  key={ l.key }
                  className={ cn(stl.markup, {
                    [ stl.error ]: l.isRed(),
                    //[ stl.warning ]: l.isYellow(),
                    //[ stl.info ]: !l.isYellow() && !l.isRed(),
                  }) }
                  style={ { left: `${ l.time * scale }%`, top: '-30px' } }
                  onClick={ this.createEventClickHandler(l) }
                >
                  <TimelinePointer
                    icon={getPointerIcon('log')}
                    content={ 
                      <div className={ stl.popup } >
                        <b>{ "Console" }</b>
                        <br/>
                        <span>{ l.value }</span>
                      </div> 
                    }
                  />
                </div>
                // <Popup
                //   //on="click"
                //   key={ l.key }
                //   offset="-19"
                //   pinned
                //   className={ cn({
                //     "info": !l.isYellow() && !l.isRed(),
                //     "warn": l.isYellow(),
                //     "error": l.isRed(),
                //   })}
                //   trigger={
                //     <div
                //       key={ l.key }
                //       className={ cn(stl.markup, {
                //         [ stl.error ]: l.isRed(),
                //         //[ stl.warning ]: l.isYellow(),
                //         //[ stl.info ]: !l.isYellow() && !l.isRed(),
                //       }) }
                //       style={ { left: `${ l.time * scale }%` } }
                //       onClick={ this.createEventClickHandler(l.time) }
                //     />
                //   }
                //   content={ 
                //     <div className={ stl.popup } >
                //       <b>{ "Console:" }</b>
                //       <br/>
                //       <span>{ l.value }</span>
                //     </div>  
                //   }
                // />
              ))
            }
            { resourceList
              .filter(r => r.isRed() || r.isYellow())
              .map(r => (
                <div
                  key={ r.key }
                  className={ cn(stl.markup, { 
                    [ stl.error ]: r.isRed(),
                    [ stl.warning ]: r.isYellow(),
                  }) }
                  style={ { left: `${ r.time * scale }%`, top: '-30px' } }
                  onClick={ this.createEventClickHandler(r) }
                >
                  <TimelinePointer
                    icon={getPointerIcon('resource')}
                    content={ 
                      <div className={ stl.popup }>
                        <b>{ r.success ? "Slow resource: " : "Missing resource:" }</b>
                        <br/>
                        { r.name }
                      </div> 
                    }
                  />
                </div>
                // <Popup
                //   key={ r.key }
                //   offset="-19"
                //   pinned
                //   trigger={
                //     <div
                //       key={ r.key }
                //       className={ cn(stl.markup, { 
                //         [ stl.error ]: r.isRed(),
                //         [ stl.warning ]: r.isYellow(),
                //       }) }
                //       style={ { left: `${ r.time * scale }%` } }
                //       onClick={ this.createEventClickHandler(r.time) }
                //     >
                      
                //     </div>
                //   }
                //   content={ 
                //     <div className={ stl.popup }>
                //       <b>{ r.success ? "Slow resource: " : "Missing resource:" }</b>
                //       <br/>
                //       { r.name }
                //     </div> 
                //   }
                // />
              ))
            }
            { fetchList
              .filter(e => e.isRed())
              .map(e => (
                <div
                  key={ e.key }
                  className={ cn(stl.markup, stl.error) }
                  style={ { left: `${ e.time * scale }%`, top: '-30px' } }
                  onClick={ this.createEventClickHandler(e) }
                >
                  <TimelinePointer
                    icon={getPointerIcon('fetch')}
                    content={ 
                      <div className={ stl.popup }>
                        <b>{ "Failed Fetch" }</b>
                        <br/>
                        { e.name }
                      </div> 
                    }
                  />
                </div>                
                // <Popup
                //   offset="-19"
                //   pinned
                //   trigger={
                //     <div
                //       key={ e.key }
                //       className={ cn(stl.markup, stl.error) }
                //       style={ { left: `${ e.time * scale }%` } }
                //       onClick={ this.createEventClickHandler(e.time) }
                //     />
                //   }
                //   content={ 
                //     <div className={ stl.popup }>
                //       <b>{ "Failed Fetch:" }</b>
                //       <br/>
                //       { e.name }
                //     </div> 
                //   }
                // />
              ))
            }
            { stackList
              .filter(e => e.isRed())
              .map(e => (
                <div
                  key={ e.key }
                  className={ cn(stl.markup, stl.error) }
                  style={ { left: `${ e.time * scale }%`, top: '-30px' } }
                  onClick={ this.createEventClickHandler(e) }
                >
                  <TimelinePointer
                    icon={getPointerIcon('stack')}
                    content={ 
                      <div className={ stl.popup }>
                        <b> { "Stack Event" }</b>
                        <br/>
                        { e.name }
                      </div> 
                    }
                  />
                </div>
                // <Popup
                //   offset="-19"
                //   pinned
                //   trigger={
                //     <div
                //       key={ e.key }
                //       className={ cn(stl.markup, stl.error) }
                //       style={ { left: `${ e.time * scale }%` } }
                //       onClick={ this.createEventClickHandler(e.time) }
                //     />
                //   }
                //   content={ 
                //     <div className={ stl.popup }>
                //       <b> { "Stack Event:" }</b>
                //       <br/>
                //       { e.name }
                //     </div> 
                //   }
                // />
              ))
            }
        </div>
        { !live && <ReduxTime name="endTime" /> }
      </div>
    );
  }
}
