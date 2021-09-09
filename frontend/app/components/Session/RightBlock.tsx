import React, { useState } from 'react'
import EventsBlock from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel'
import { Controls as PlayerControls } from 'Player';
import { Tabs } from 'UI';
import { connectPlayer } from 'Player';
import NewBadge from 'Shared/NewBadge';

const EVENTS = 'Events';
const HEATMAPS = 'Heatmaps';

const TABS = [ EVENTS, HEATMAPS ].map(tab => ({ text: tab, key: tab }));


const EventsBlockConnected = connectPlayer(state => ({
  currentTimeEventIndex: state.eventListNow.length > 0 ? state.eventListNow.length - 1 : 0,
  playing: state.playing,
}))(EventsBlock)

export default function RightBlock() {
  const [activeTab, setActiveTab] = useState(EVENTS)

  const renderActiveTab = (tab) => {
    switch(tab) {
      case EVENTS:
        return <EventsBlockConnected player={PlayerControls}/>
      case HEATMAPS:
        return <PageInsightsPanel />
    }
  }
  return (
    <div style={{ width: '270px', height: 'calc(100vh- 50px)'}} className="flex flex-col">
      <div className="relative">
        <Tabs
          tabs={ TABS }
          active={ activeTab }
          onClick={ (tab) => setActiveTab(tab) }
          border={ true }
        />
        <div className="absolute" style={{ left: '160px', top: '13px' }}>{ <NewBadge />}</div>
      </div>
      {
        renderActiveTab(activeTab)       
      }            
    </div>
  ) 
}
