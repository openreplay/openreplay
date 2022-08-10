import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import {
  connectPlayer,
  STORAGE_TYPES,
  selectStorageType,
  selectStorageListNow,
} from 'Player/store';
import LiveTag from 'Shared/LiveTag';

import { Icon } from 'UI';
import { toggleInspectorMode } from 'Player';
import {
  fullscreenOn,
  fullscreenOff,
  toggleBottomBlock,
  CONSOLE,
  NETWORK,
  STACKEVENTS,
  STORAGE,
  PROFILER,
  PERFORMANCE,
  GRAPHQL,
  FETCH,
  EXCEPTIONS,
  INSPECTOR,
} from 'Duck/components/player';
import { ReduxTime } from './Time';
import Timeline from './Timeline';
import ControlButton from './ControlButton';

import styles from './controls.module.css';
import { Tooltip } from 'react-tippy';


function getStorageIconName(type) {
  switch(type) {
    case STORAGE_TYPES.REDUX:
      return "vendors/redux";
    case STORAGE_TYPES.MOBX:
      return "vendors/mobx"
    case STORAGE_TYPES.VUEX:
      return "vendors/vuex";
    case STORAGE_TYPES.NGRX:
      return "vendors/ngrx";
    case STORAGE_TYPES.NONE:
      return "store"
  }
}

function getStorageName(type) {
  switch(type) {
    case STORAGE_TYPES.REDUX:
      return "REDUX";
    case STORAGE_TYPES.MOBX:
      return "MOBX";
    case STORAGE_TYPES.VUEX:
      return "VUEX";
    case STORAGE_TYPES.NGRX:
      return "NGRX";
    case STORAGE_TYPES.NONE:
      return "STATE";
  }
}

@connectPlayer(state => ({
  time: state.time,
  endTime: state.endTime,
  live: state.live,
  livePlay: state.livePlay,
  playing: state.playing,
  completed: state.completed,
  skip: state.skip,
  skipToIssue: state.skipToIssue,
  speed: state.speed,
  disabled: state.cssLoading || state.messagesLoading || state.inspectorMode || state.markedTargets,
  inspectorMode: state.inspectorMode,
  fullscreenDisabled: state.messagesLoading,
  logCount: state.logListNow.length,
  logRedCount: state.logRedCountNow,
  // resourceCount: state.resourceCountNow,
  resourceRedCount: state.resourceRedCountNow,
  fetchRedCount: state.fetchRedCountNow,
  showStack: state.stackList.length > 0,
  stackCount: state.stackListNow.length,
  stackRedCount: state.stackRedCountNow,
  profilesCount: state.profilesListNow.length,
  storageCount: selectStorageListNow(state).length,
  storageType: selectStorageType(state),
  showStorage: selectStorageType(state) !== STORAGE_TYPES.NONE,
  showProfiler: state.profilesList.length > 0,
  showGraphql: state.graphqlList.length > 0,
  showFetch: state.fetchCount > 0,
  fetchCount: state.fetchCountNow,
  graphqlCount: state.graphqlListNow.length,
  exceptionsCount: state.exceptionsListNow.length,
  showExceptions: state.exceptionsList.length > 0,
  showLongtasks: state.longtasksList.length > 0,
}))
@connect((state, props) => {
  const permissions = state.getIn([ 'user', 'account', 'permissions' ]) || [];
  const isEnterprise = state.getIn([ 'user', 'account', 'edition' ]) === 'ee';
  return {
    disabled: props.disabled || (isEnterprise && !permissions.includes('DEV_TOOLS')),
    fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
    bottomBlock: state.getIn([ 'components', 'player', 'bottomBlock' ]),
    showStorage: props.showStorage || !state.getIn(['components', 'player', 'hiddenHints', 'storage']),
    showStack: props.showStack || !state.getIn(['components', 'player', 'hiddenHints', 'stack']),
    closedLive: !!state.getIn([ 'sessions', 'errors' ]) || !state.getIn([ 'sessions', 'current', 'live' ]),
  }
}, {
  fullscreenOn,
  fullscreenOff,
  toggleBottomBlock,
})
export default class Controls extends React.Component {

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    //this.props.toggleInspectorMode(false);
  }

  shouldComponentUpdate(nextProps) {
    if (
      nextProps.fullscreen !== this.props.fullscreen ||
      nextProps.bottomBlock !== this.props.bottomBlock ||
      nextProps.endTime !== this.props.endTime ||
      nextProps.live !== this.props.live ||
      nextProps.livePlay !== this.props.livePlay ||
      nextProps.playing !== this.props.playing ||
      nextProps.completed !== this.props.completed ||
      nextProps.skip !== this.props.skip ||
      nextProps.skipToIssue !== this.props.skipToIssue ||
      nextProps.speed !== this.props.speed ||
      nextProps.disabled !== this.props.disabled ||
      nextProps.fullscreenDisabled !== this.props.fullscreenDisabled ||
      // nextProps.inspectorMode !== this.props.inspectorMode ||
      nextProps.logCount !== this.props.logCount ||
      nextProps.logRedCount !== this.props.logRedCount ||
      nextProps.resourceRedCount !== this.props.resourceRedCount ||
      nextProps.fetchRedCount !== this.props.fetchRedCount ||
      nextProps.showStack !== this.props.showStack ||
      nextProps.stackCount !== this.props.stackCount ||
      nextProps.stackRedCount !== this.props.stackRedCount ||
      nextProps.profilesCount !== this.props.profilesCount ||
      nextProps.storageCount !== this.props.storageCount ||
      nextProps.storageType !== this.props.storageType ||
      nextProps.showStorage !== this.props.showStorage ||
      nextProps.showProfiler !== this.props.showProfiler ||
      nextProps.showGraphql !== this.props.showGraphql ||
      nextProps.showFetch !== this.props.showFetch ||
      nextProps.fetchCount !== this.props.fetchCount ||
      nextProps.graphqlCount !== this.props.graphqlCount ||
      nextProps.showExceptions !== this.props.showExceptions ||
      nextProps.exceptionsCount !== this.props.exceptionsCount ||
      nextProps.showLongtasks !== this.props.showLongtasks
    ) return true;
    return false;
  }

  onKeyDown = (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (this.props.inspectorMode) {
      if (e.key === 'Esc' || e.key === 'Escape') {
        toggleInspectorMode(false);
      }
    };
    // if (e.key === ' ') {
    //   document.activeElement.blur();
    //   this.props.togglePlay();
    // }
    if (e.key === 'Esc' || e.key === 'Escape') {
      this.props.fullscreenOff();
    }
    if (e.key === "ArrowRight") {
      this.forthTenSeconds();
    }
    if (e.key === "ArrowLeft") {
      this.backTenSeconds();
    }
    if (e.key === "ArrowDown") {
      this.props.speedDown();
    }
    if (e.key === "ArrowUp") {
      this.props.speedUp();
    }
  }

  forthTenSeconds = () => {
    const { time, endTime, jump } = this.props;
    jump(Math.min(endTime, time + 1e4))
  }

  backTenSeconds = () => {  //shouldComponentUpdate
    const { time, jump } = this.props;
    jump(Math.max(0, time - 1e4));
  }

  goLive =() => this.props.jump(this.props.endTime)

  renderPlayBtn = () => {
    const { completed, playing, disabled } = this.props;
    let label;
    let icon;
    if (completed) {
      icon = 'arrow-clockwise';
      label = 'Replay this session'
    } else if (playing) {
      icon = 'pause-fill';
      label = 'Pause';
    } else {
      icon = 'play-fill-new';
      label = 'Pause';
      label = 'Play'
    }

    return (
      <Tooltip
        delay={0}
        position="top"
        title={label}
        interactive
        hideOnClick="persistent"
        className="mr-4"
      >
        <div
          onClick={this.props.togglePlay}
          className="hover-main color-main cursor-pointer rounded hover:bg-gray-light-shade"
        >
            <Icon name={icon} size="36" color="inherit" />
        </div>
      </Tooltip>
    )
  }

  controlIcon = (icon, size, action, isBackwards, additionalClasses) =>
    <div
        onClick={ action }
        className={cn("py-1 px-2 hover-main cursor-pointer", additionalClasses)}
        style={{ transform: isBackwards ? 'rotate(180deg)' : '' }}
      >
        <Icon name={icon} size={size} color="inherit" />
    </div>

  render() {
    const {
      bottomBlock,
      toggleBottomBlock,
      live,
      livePlay,
      skip,
      speed,
      disabled,
      logCount,
      logRedCount,
      resourceRedCount,
      fetchRedCount,
      showStack,
      stackCount,
      stackRedCount,
      profilesCount,
      storageCount,
      showStorage,
      storageType,
      showProfiler,
      showGraphql,
      showFetch,
      fetchCount,
      graphqlCount,
      exceptionsCount,
      showExceptions,
      fullscreen,
      inspectorMode,
      closedLive,
    } = this.props;

    const toggleBottomTools = (blockName) => {
      if (blockName === INSPECTOR) {
        toggleInspectorMode();
        bottomBlock && toggleBottomBlock();
      } else {
        toggleInspectorMode(false);
        toggleBottomBlock(blockName);
      }
    }
    return (
      <div className={ cn(styles.controls, {'px-5 pt-0' : live}) }>
        { !live && <Timeline jump={ this.props.jump } pause={this.props.pause} togglePlay={this.props.togglePlay} /> }
        { !fullscreen &&
          <div className={ styles.buttons } data-is-live={ live }>
            <div>
              { !live && (
                <div className="flex items-center">
                  { this.renderPlayBtn() }
                  { !live && (
                    <div className="flex items-center font-semibold text-center" style={{ minWidth: 85 }}>
                      <ReduxTime isCustom name="time" format="mm:ss" />
                      <span className="px-1">/</span>
                      <ReduxTime isCustom name="endTime" format="mm:ss" />
                    </div>
                  )}

                  <div className="rounded ml-4 bg-active-blue border border-active-blue-border flex items-stretch">
                    <Tooltip
                        title='Rewind 10s'
                        delay={0}
                        position="top"
                      >
                        {this.controlIcon("skip-forward-fill", 18, this.backTenSeconds, true, 'hover:bg-active-blue-border color-main h-full flex items-center')}
                      </Tooltip>
                    <div className='p-1 border-l border-r bg-active-blue-border border-active-blue-border'>10s</div>
                    <Tooltip
                        title='Forward 10s'
                        delay={0}
                        position="top"
                      >
                        {this.controlIcon("skip-forward-fill", 18, this.forthTenSeconds, false, 'hover:bg-active-blue-border color-main h-full flex items-center')}
                    </Tooltip>
                  </div>

                  {!live &&
                    <div className='flex items-center mx-4'>
                      <Tooltip
                        title='Playback speed'
                        delay={0}
                        position="top"
                      >
                        <button
                          className={ styles.speedButton }
                          onClick={ this.props.toggleSpeed }
                          data-disabled={ disabled }
                        >
                          <div>{ speed + 'x' }</div>
                        </button>
                      </Tooltip>

                      <button
                        className={ cn(styles.skipIntervalButton, { [styles.withCheckIcon]: skip, [styles.active]: skip }, 'ml-4') }
                        onClick={ this.props.toggleSkip }
                        data-disabled={ disabled }
                      >
                        {skip && <Icon name="check" size="24" className="mr-1" />}
                        { 'Skip Inactivity' }
                      </button>
                    </div>
                  }
                </div>
              )}

              { live && !closedLive && (
                <div className={ styles.buttonsLeft }>
                  <LiveTag isLive={livePlay} />
                  {'Elapsed'}
                  <ReduxTime name="time" />
                </div>
              )}
            </div>

            <div className="flex items-center h-full">
              { !live && <div className={cn(styles.divider, 'h-full')} /> }
              {/* ! TEMP DISABLED !
              {!live && (
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  active={ inspectorMode }
                  onClick={ () => toggleBottomTools(INSPECTOR) }
                  noIcon
                  labelClassName="!text-base font-semibold"
                  label="INSPECT"
                  containerClassName="mx-2"
                />
              )} */}
              <ControlButton
                disabled={ disabled && !inspectorMode }
                onClick={ () => toggleBottomTools(CONSOLE) }
                active={ bottomBlock === CONSOLE && !inspectorMode}
                label="CONSOLE"
                noIcon
                labelClassName="!text-base font-semibold"
                count={ logCount }
                hasErrors={ logRedCount > 0 }
                containerClassName="mx-2"
              />
              { !live &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(NETWORK) }
                  active={ bottomBlock === NETWORK && !inspectorMode }
                  label="NETWORK"
                  hasErrors={ resourceRedCount > 0 }
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              {!live &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(PERFORMANCE) }
                  active={ bottomBlock === PERFORMANCE && !inspectorMode }
                  label="PERFORMANCE"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              {showFetch &&
                <ControlButton
                  disabled={disabled && !inspectorMode}
                  onClick={ ()=> toggleBottomTools(FETCH) }
                  active={ bottomBlock === FETCH && !inspectorMode }
                  hasErrors={ fetchRedCount > 0 }
                  count={ fetchCount }
                  label="FETCH"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              { !live && showGraphql &&
                <ControlButton
                  disabled={disabled && !inspectorMode}
                  onClick={ ()=> toggleBottomTools(GRAPHQL) }
                  active={ bottomBlock === GRAPHQL && !inspectorMode }
                  count={ graphqlCount }
                  label="GRAPHQL"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              { !live && showStorage &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(STORAGE) }
                  active={ bottomBlock === STORAGE && !inspectorMode }
                  count={ storageCount }
                  label={ getStorageName(storageType) }
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              { showExceptions &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(EXCEPTIONS) }
                  active={ bottomBlock === EXCEPTIONS && !inspectorMode }
                  label="EXCEPTIONS"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                  count={ exceptionsCount }
                  hasErrors={ exceptionsCount > 0 }
                />
              }
              { !live && showStack &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(STACKEVENTS) }
                  active={ bottomBlock === STACKEVENTS && !inspectorMode }
                  label="EVENTS"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                  count={ stackCount }
                  hasErrors={ stackRedCount > 0 }
                />
              }
              { !live && showProfiler &&
                <ControlButton
                  disabled={ disabled && !inspectorMode }
                  onClick={ () => toggleBottomTools(PROFILER) }
                  active={ bottomBlock === PROFILER && !inspectorMode }
                  count={ profilesCount }
                  label="PROFILER"
                  noIcon
                  labelClassName="!text-base font-semibold"
                  containerClassName="mx-2"
                />
              }
              { !live && <div className={cn(styles.divider, 'h-full')} /> }
              { !live && (
                <Tooltip
                  title="Fullscreen"
                  delay={0}
                  position="top-end"
                  className="mx-4"
                >
                  {this.controlIcon("arrows-angle-extend", 18, this.props.fullscreenOn, false, "rounded hover:bg-gray-light-shade color-gray-medium")}
                </Tooltip>
              )
              }
            </div>
          </div>
        }
      </div>
    );
  }
}
