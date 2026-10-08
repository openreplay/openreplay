import cn from 'classnames';
import React from 'react';

import TagWatch from 'Components/Session/Player/TagWatch';
import IssuePanel from 'Components/SmartAlerts/IssuePlayer/IssuePanel';

import EventsBlock from '../Session_/EventsBlock';
import PageInsightsPanel from '../Session_/PageInsightsPanel/PageInsightsPanel';
import UnitStepsModal from '../Session_/UnitStepsModal';
import stl from './rightblock.module.css';

function RightBlock({
  activeTab,
  setActiveTab,
  embedded,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** inside ReplayScreen's side panel, which owns width and border */
  embedded?: boolean;
}) {
  const panel = (extra = 'flex flex-col') =>
    embedded
      ? 'flex flex-col h-full'
      : cn(extra, 'bg-surface-default border-l', stl.panel);
  switch (activeTab) {
    case 'EVENTS':
      return (
        // bg-surface-default to match the other panels — without it the events list shows
        // the dark player backdrop and reads as a different theme
        <div className={panel()}>
          <EventsBlock setActiveTab={setActiveTab} />
        </div>
      );
    case 'CLICKMAP':
      return (
        <div className={panel()}>
          <PageInsightsPanel setActiveTab={setActiveTab} />
        </div>
      );
    case 'INSPECTOR':
      return (
        <div className={panel('')}>
          <TagWatch />
        </div>
      );
    case 'EXPORT':
      return (
        <div
          className={
            embedded
              ? 'flex flex-col h-full'
              : cn('bg-surface-default border-l', stl.extraPanel)
          }
        >
          <UnitStepsModal onClose={() => setActiveTab('EVENTS')} />
        </div>
      );
    case 'ISSUE':
      // the Smart Issues panel — reads its issue/session from issuesStore
      return (
        <div className={panel()}>
          <IssuePanel onClose={() => setActiveTab('')} />
        </div>
      );
    default:
      return null;
  }
}

export default RightBlock;
