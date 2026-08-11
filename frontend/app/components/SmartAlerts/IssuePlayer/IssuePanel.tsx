import { CloseOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { SegmentChip } from '../segments/SegmentScope';
import {
  CategoryLabel,
  CriticalToggle,
  Eyebrow,
  ImpactGauge,
  impactLevel,
} from '../shared';
import IssueContextTabs from './IssueContextTabs';

/* The right-hand "Issue" context panel. Rendered inside the shared RightBlock
   (RightBlock provides the panel chrome — width, border, bg); its issue + session
   data come from issuesStore, so only the close action is passed by the host. */
function IssuePanel({ onClose }: { onClose: () => void }) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const issue = issuesStore.playerIssue;
  if (!issue) return null;
  const card = issuesStore.playerCard ?? undefined;
  const critState = issuesStore.critState(issue.id);
  const segmentNames = issue.segmentIds.map(
    (id) => issuesStore.segmentName(id) ?? id,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-lg">{t('Issue')}</span>
        <Button
          type="text"
          size="small"
          onClick={onClose}
          icon={<CloseOutlined />}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
        {/* the issue */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow text={t('Issue')} />
          <span
            className="font-semibold color-gray-darkest"
            style={{ fontSize: 17, lineHeight: 1.35 }}
          >
            {issue.head}
          </span>
          <div className="flex items-center gap-2.5 flex-wrap color-gray-medium">
            {issue.cat && (
              <>
                <CategoryLabel cat={issue.cat} />
                <span className="color-gray-light">|</span>
              </>
            )}
            <Tooltip
              title={t('{{level}} impact', {
                level: t(impactLevel(issue.impact)),
              })}
            >
              <span className="inline-flex items-center cursor-default">
                <ImpactGauge value={issue.impact} />
              </span>
            </Tooltip>
            <span className="color-gray-light">|</span>
            <CriticalToggle
              state={critState}
              onOpen={() => issuesStore.openCriticalDialog(issue.id)}
            />
          </div>
        </div>

        {/* this session — its variation headline */}
        {card?.variation && (
          <div className="flex flex-col gap-1.5">
            <Eyebrow text={t('This session')} />
            <span
              className="font-medium color-gray-darkest"
              style={{ fontSize: 15, lineHeight: 1.4 }}
            >
              {card.variation}
            </span>
          </div>
        )}

        {/* segments that surfaced this issue */}
        {segmentNames.length > 0 && (
          <div className="flex items-center gap-2 text-sm min-w-0 flex-wrap">
            <span className="color-gray-medium shrink-0">{t('Segments:')}</span>
            {segmentNames.map((name) => (
              <SegmentChip key={name} name={name} />
            ))}
          </div>
        )}

        <IssueContextTabs issue={issue} card={card} />
      </div>
    </div>
  );
}

export default observer(IssuePanel);
