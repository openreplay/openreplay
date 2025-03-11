import React from 'react';
import EventsBlock from '../Session_/EventsBlock';
import HighlightPanel from "../Session_/Highlight/HighlightPanel";
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel';
import UnitStepsModal from "../Session_/UnitStepsModal";
import TagWatch from 'Components/Session/Player/TagWatch';
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
        <div className={cn('flex flex-col border-l', stl.panel)}>
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
    case 'HIGHLIGHT':
      return (
        <div className={cn('bg-white border-l', stl.panel)}>
          <HighlightPanel onClose={() => setActiveTab('')} />
        </div>
      )
    case 'EXPORT':
      return (
        <div className={cn('bg-white border-l', stl.extraPanel)}>
          <UnitStepsModal onClose={() => setActiveTab('EVENTS')} />
        </div>
      )
    default:
      return null;
  }
}

export default RightBlock;
