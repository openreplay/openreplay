import React from 'react'
import EventsBlock from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel'

import cn from 'classnames';
import stl from './rightblock.module.css';

function RightBlock(props: any) {
  const { activeTab } = props;

  if (activeTab === props.tabs.EVENTS) {
    return (
      <div className={cn("flex flex-col bg-white border-l", stl.panel)}>
        <EventsBlock
          setActiveTab={props.setActiveTab}
        />
      </div>
    )
  }
  if (activeTab === props.tabs.HEATMAPS) {
    return (
      <div className={cn("flex flex-col bg-white border-l", stl.panel)}>
        <PageInsightsPanel setActiveTab={props.setActiveTab} />
      </div>
    )
  }
  return null
}

export default RightBlock
