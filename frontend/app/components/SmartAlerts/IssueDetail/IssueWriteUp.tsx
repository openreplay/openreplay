import { Chip } from '@/ui/data/Chip';
import { ImpactMeter } from '@/ui/data/ImpactMeter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { FoundInChips } from '../segments/SegmentScope';
import {
  CAT_ICON,
  type Issue,
  impactLevel,
  lastSeenExact,
  lastSeenLabel,
} from '../shared';
import './issue-write-up.css';

/** The issue as the agent wrote it: facts in a row, then the answers. */
function IssueWriteUp({ issue, title }: { issue: Issue; title: string }) {
  const { t } = useTranslation();
  const CatIcon = issue.cat ? CAT_ICON[issue.cat] : null;
  const answers = [
    issue.problem && {
      key: 'problem',
      label: t('The problem'),
      text: issue.problem,
    },
    issue.fix && { key: 'fix', label: t('Suggested fix'), text: issue.fix },
  ].filter(Boolean) as { key: string; label: string; text: string }[];

  return (
    <article className="m-wu m-wu--full">
      <header className="m-wu__head">
        <h1 className="m-wu__title">{title}</h1>
        <dl className="m-wu__facts">
          {issue.cat && CatIcon && (
            <div className="m-wu__fact">
              <dt>{t('Category')}</dt>
              <dd className="inline-flex items-center gap-2">
                <CatIcon size={13} aria-hidden="true" />
                {t(issue.cat)}
              </dd>
            </div>
          )}
          <div className="m-wu__fact">
            <dt>{t('Impact')}</dt>
            <dd>
              <ImpactMeter level={impactLevel(issue.impact)} />
            </dd>
          </div>
          <div className="m-wu__fact">
            <dt>{t('Found in')}</dt>
            <dd className="m-wu__origin">
              <FoundInChips issue={issue} />
            </dd>
          </div>
          <div className="m-wu__fact">
            <dt>{t('Sessions')}</dt>
            <dd>{issue.impactedSessions.toLocaleString()}</dd>
          </div>
          {issue.seenAgoMin != null && (
            <div className="m-wu__fact">
              <dt>{t('Last seen')}</dt>
              <dd>
                <Tooltip title={lastSeenExact(issue.seenAgoMin)} delay={200}>
                  <span>{lastSeenLabel(issue.seenAgoMin)}</span>
                </Tooltip>
              </dd>
            </div>
          )}
          {issue.journeyLabels.length > 0 && (
            <div className="m-wu__fact m-wu__fact--tags">
              <dt>{t('Tags')}</dt>
              <dd className="m-wu__tags">
                {issue.journeyLabels.map((tag) => (
                  <Chip key={tag} kind="tag">
                    {tag}
                  </Chip>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </header>
      {answers.length > 1 ? (
        <Tabs className="m-wu__tabs" defaultValue={answers[0].key}>
          <TabsList className="m-wu__tabstrip">
            {answers.map((a) => (
              <TabsTrigger key={a.key} value={a.key}>
                {a.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {answers.map((a) => (
            <TabsContent key={a.key} value={a.key} className="m-wu__panel">
              <p className="m-wu__prose">{a.text}</p>
            </TabsContent>
          ))}
        </Tabs>
      ) : answers.length === 1 ? (
        <section className="m-wu__panel">
          <h2 className="m-wu__section">{answers[0].label}</h2>
          <p className="m-wu__prose">{answers[0].text}</p>
        </section>
      ) : null}
    </article>
  );
}

export default observer(IssueWriteUp);
