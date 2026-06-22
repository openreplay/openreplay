import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import SessionMetaList from 'Shared/SessionItem/SessionMetaList';

import {
  CategoryLabel,
  CriticalToggle,
  ImpactGauge,
  type Issue,
  type IssueSessionCard,
  TagChip,
  impactLevel,
} from '../shared';
import ProblemResolutionTabs from './ProblemResolutionTabs';

const TOP_Z = 2147483647;

/* The right-hand "Issue" context panel: issue identity → this session's
   variation → problem / suggested-fix tabs. */
export default function IssuePanel({
  issue,
  card,
  onClose,
  onSetCritical,
}: {
  issue: Issue;
  card?: IssueSessionCard;
  onClose: () => void;
  onSetCritical: (val: boolean, reason?: string) => void;
}) {
  const hasSessionBlock =
    Boolean(card?.variation) ||
    Boolean(card?.journey) ||
    (card?.tags?.length ?? 0) > 0 ||
    Boolean(card?.plan);

  return (
    <div
      className="flex flex-col h-full bg-white border-l border-gray-light"
      style={{ width: 320 }}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-light">
        <span className="font-medium text-lg">Issue</span>
        <Button
          type="text"
          size="small"
          onClick={onClose}
          icon={<CloseOutlined />}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span
            className="font-semibold color-gray-darkest leading-snug"
            style={{ fontSize: 17 }}
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
            <span className="inline-flex items-center gap-1.5">
              <ImpactGauge value={issue.impact} />
              <span className="text-sm whitespace-nowrap">
                {impactLevel(issue.impact)} impact
              </span>
            </span>
            <span className="color-gray-light">|</span>
            <CriticalToggle
              critical={issue.critical}
              onSet={onSetCritical}
              zIndex={TOP_Z}
            />
          </div>
        </div>

        {hasSessionBlock && (
          <div className="flex flex-col gap-3">
            <span
              className="text-xs font-semibold uppercase color-gray-medium"
              style={{ letterSpacing: '0.05em' }}
            >
              This session
            </span>
            {card?.variation && (
              <span
                className="font-medium color-gray-darkest leading-snug"
                style={{ fontSize: 15 }}
              >
                {card.variation}
              </span>
            )}
            {(card?.tags?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {card!.tags.map((t) => (
                  <TagChip key={t} label={t} />
                ))}
              </div>
            )}
            {card?.journey && (
              <span
                className="color-gray-dark leading-relaxed"
                style={{ fontSize: 15 }}
              >
                {card.journey}
              </span>
            )}
            {card?.plan && (
              <SessionMetaList
                horizontal
                maxLength={3}
                metaList={[{ label: 'plan', value: card.plan }]}
              />
            )}
          </div>
        )}

        <ProblemResolutionTabs issue={issue} />
      </div>
    </div>
  );
}
