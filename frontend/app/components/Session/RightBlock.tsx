import React from 'react';
import EventsBlock from '../Session_/EventsBlock';
import HighlightPanel from '../Session_/Highlight/HighlightPanel';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel';
import UnitStepsModal from '../Session_/UnitStepsModal';
import IssuePanel from 'Components/SmartAlerts/IssuePlayer/IssuePanel';
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
        // bg-white to match the other panels — without it the events list shows
        // the dark player backdrop and reads as a different theme
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
    case 'HIGHLIGHT':
      return (
        <div className={cn('bg-white border-l', stl.panel)}>
          <HighlightPanel onClose={() => setActiveTab('')} />
        </div>
      );
    case 'EXPORT':
      return (
        <div className={cn('bg-white border-l', stl.extraPanel)}>
          <UnitStepsModal onClose={() => setActiveTab('EVENTS')} />
        </div>
      );
    case 'ISSUE':
      // the Smart Issues panel — reads its issue/session from issuesStore
      return (
        <div className={cn('flex flex-col bg-white border-l', stl.panel)}>
          <IssuePanel onClose={() => setActiveTab('')} />
        </div>
      );
    default:
      return null;
  }
}

export default RightBlock;
