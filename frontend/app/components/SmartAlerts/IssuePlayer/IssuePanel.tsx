import { CloseOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  CategoryLabel,
  CriticalToggle,
  Eyebrow,
  ImpactGauge,
  type Issue,
  type IssueSessionCard,
  PLAYER_POPUP_Z,
  impactLevel,
} from '../shared';
import IssueContextTabs from './IssueContextTabs';

/* The right-hand "Issue" context panel: issue identity → this session's
   variation → Journey / Details tabs. */
export default function IssuePanel({
  issue,
  card,
  onClose,
  onSetCritical,
  criticalReasons,
}: {
  issue: Issue;
  card?: IssueSessionCard;
  onClose: () => void;
  onSetCritical: (val: boolean, reasons?: string[], note?: string) => void;
  criticalReasons?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col h-full bg-white border-l border-gray-light"
      style={{ width: 320 }}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-light">
        <span className="font-medium text-lg">{t('Issue')}</span>
        <Button
          type="text"
          size="small"
          onClick={onClose}
          icon={<CloseOutlined />}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
        {/* 1 · the issue — labelled so the title is never confused with the
            session variation below */}
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
              critical={issue.critical}
              onSet={onSetCritical}
              reasons={criticalReasons}
              zIndex={PLAYER_POPUP_Z}
            />
          </div>
        </div>

        {/* 2 · this session — its variation headline (tags + journey live in the
            Journey tab; environment metadata lives in the header "More") */}
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

        {/* 3 · Journey (path via tags + steps) and Details (problem + fix) */}
        <IssueContextTabs issue={issue} card={card} />
      </div>
    </div>
  );
}
