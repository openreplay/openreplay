import { ImpactMeter } from '@/ui/data/ImpactMeter';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { SegmentChip } from '../segments/SegmentScope';
import { CAT_ICON, impactLevel } from '../shared';
import IssueContextTabs from './IssueContextTabs';
import './issue-panel.css';

/* The replay's "Issue" side panel; its data comes from issuesStore. */
function IssuePanel(_props: { onClose: () => void }) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const issue = issuesStore.playerIssue;
  if (!issue) return null;
  const card = issuesStore.playerCard ?? undefined;
  const CatIcon = issue.cat ? CAT_ICON[issue.cat] : null;
  const segmentNames = issue.segmentIds.map(
    (id) => issuesStore.segmentName(id) ?? id,
  );

  return (
    <div className="m-ipanel">
      <header className="m-ipanel__head">
        <span className="m-ipanel__eyebrow">{t('Issue')}</span>
        <span className="m-ipanel__title">{issue.head}</span>
        <span className="m-ipanel__meta">
          <ImpactMeter level={impactLevel(issue.impact)} />
          {issue.cat && CatIcon && (
            <span className="inline-flex items-center gap-1">
              <CatIcon size={12} aria-hidden="true" />
              {t(issue.cat)}
            </span>
          )}
        </span>
        {card?.variation && (
          <>
            <span className="m-ipanel__eyebrow">{t('This session')}</span>
            <span className="m-ipanel__variation">{card.variation}</span>
          </>
        )}
        {segmentNames.length > 0 && (
          <span className="m-ipanel__segments">
            {segmentNames.map((name) => (
              <SegmentChip key={name} name={name} />
            ))}
          </span>
        )}
      </header>
      <IssueContextTabs issue={issue} card={card} />
    </div>
  );
}

export default observer(IssuePanel);
