import { Segmented } from '@/ui/inputs/toggle-group';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Components/Session/ReplayScreen/side-panel.css';

import type { Issue, IssueSessionCard } from '../shared';
import DetailsView from './DetailsView';
import JourneyView from './JourneyView';

/* Journey and Details, side by side under one switch. */
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
    <div className="flex flex-col">
      <div className="m-spanel__bar">
        <Segmented
          block
          value={view}
          onChange={(v) => setView(v as 'journey' | 'details')}
          ariaLabel={t('Journey or details')}
          options={[
            {
              value: 'journey',
              label: `${t('Journey')}${card?.journeySteps?.length ? ` · ${card.journeySteps.length}` : ''}`,
            },
            { value: 'details', label: t('Details') },
          ]}
        />
      </div>
      {view === 'journey' ? (
        <JourneyView card={card} />
      ) : (
        <DetailsView issue={issue} />
      )}
    </div>
  );
}
