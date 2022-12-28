import React from 'react'
import EventsBlock from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel'
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

import cn from 'classnames';
import stl from './rightblock.module.css';

function RightBlock(props: any) {
  const { activeTab } = props;
  const { player, store } = React.useContext(PlayerContext)

  const { eventListNow, playing } = store.get()
  const currentTimeEventIndex = eventListNow.length > 0 ? eventListNow.length - 1 : 0

  const EventsBlockConnected = () => <EventsBlock playing={playing} player={player} setActiveTab={props.setActiveTab} currentTimeEventIndex={currentTimeEventIndex} />
  const renderActiveTab = (tab: string) => {
    switch(tab) {
      case props.tabs.EVENTS:
        return <EventsBlockConnected />
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

export default observer(RightBlock)
