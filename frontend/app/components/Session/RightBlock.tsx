import SummaryBlock      from "Components/Session/Player/ReplayPlayer/SummaryBlock";
import React             from 'react';
import EventsBlock       from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel';
import TagWatch          from "Components/Session/Player/TagWatch";

import cn from 'classnames';
import stl from './rightblock.module.css';

function RightBlock({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  switch (activeTab) {
    case 'EVENTS':
      return (
        <div className={cn('flex flex-col bg-white border-l', stl.panel)}>
          <EventsBlock setActiveTab={setActiveTab} />
        </div>
      );
    case 'CLICKMAP':
      return (
        <div className={cn('flex flex-col bg-white border-l', stl.panel)}>
          <PageInsightsPanel setActiveTab={setActiveTab} />
        </div>
      );
    case 'INSPECTOR':
      return (
        <div className={cn('bg-white border-l', stl.panel)}>
          <TagWatch />
        </div>
      );
    case 'SUMMARY':
      return (
        <div className={cn('bg-white border-l', stl.panel)}>
          <SummaryBlock />
        </div>
      )
    default:
      return null;
  }
}

export default RightBlock;
