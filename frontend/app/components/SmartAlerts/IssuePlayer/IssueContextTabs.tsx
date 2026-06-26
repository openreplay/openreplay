import { Segmented } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Issue, IssueSessionCard } from '../shared';
import DetailsView from './DetailsView';
import JourneyView from './JourneyView';

/* Slide-out context as two tabs: Journey (the path, via tags + steps) and
   Details (the plain-language problem + suggested fix). */
export default function IssueContextTabs({
  issue,
  card,
}: {
  issue: Issue;
  card?: IssueSessionCard;
}) {
  const { t } = useTranslation();
  const [view, setView] = React.useState<'journey' | 'details'>('journey');
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        block
        value={view}
        onChange={(v) => setView(v as 'journey' | 'details')}
        options={[
          { label: t('Journey'), value: 'journey' },
          { label: t('Details'), value: 'details' },
        ]}
      />
      {view === 'journey' ? (
        <JourneyView card={card} />
      ) : (
        <DetailsView issue={issue} />
      )}
    </div>
  );
}
