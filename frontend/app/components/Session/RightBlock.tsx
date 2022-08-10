import React, { useState } from 'react'
import EventsBlock from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel'
import { Controls as PlayerControls } from 'Player';
import { connectPlayer } from 'Player';
import cn from 'classnames';
import stl from './rightblock.module.css';

const EventsBlockConnected = connectPlayer(state => ({
  currentTimeEventIndex: state.eventListNow.length > 0 ? state.eventListNow.length - 1 : 0,
  playing: state.playing,
}))(EventsBlock)

function RightBlock(props) {
  const { activeTab } = props;

  const renderActiveTab = (tab) => {
    switch(tab) {
      case props.tabs.EVENTS:
        return <EventsBlockConnected setActiveTab={props.setActiveTab} player={PlayerControls}/>
      case props.tabs.HEATMAPS:
        return <PageInsightsPanel setActiveTab={props.setActiveTab} />
    }
  }
  return (
    <div className={cn("flex flex-col bg-white border-l", stl.panel)}>
          {renderActiveTab(activeTab)}
    </div>
  )
}

export default React.memo(RightBlock)
