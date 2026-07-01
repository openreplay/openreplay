import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  CategoryLabel,
  CriticalControl,
  ImpactGauge,
  type Issue,
  impactLevel,
  lastSeenLabel,
} from '../shared';
import EditableTitle from './EditableTitle';

interface Props {
  issue: Issue;
  /** when set, the title is click-to-rename */
  editable?: boolean;
  onRename?: (name: string) => void;
  /** when set, the Critical chip becomes a two-way toggle */
  onSetCritical?: (val: boolean, reasons?: string[], note?: string) => void;
  /** reason vocabulary for the un-mark popover (server-provided) */
  criticalReasons?: string[];
  /** right-aligned actions on the title row (e.g. Create ticket / Hide) */
  actions?: React.ReactNode;
  /** title+actions header, full-width divider, then body */
  framed?: boolean;
  hideProblem?: boolean;
}

const Sep = () => <span className="color-gray-light">|</span>;

export default function ProblemCard({
  issue,
  editable,
  onRename,
  onSetCritical,
  criticalReasons,
  actions,
  framed,
  hideProblem,
}: Props) {
  const { t } = useTranslation();
  const title =
    editable && onRename ? (
      <EditableTitle value={issue.head} onSave={onRename} />
    ) : (
      <span className="text-xl font-semibold color-gray-darkest leading-tight">
        {issue.head}
      </span>
    );

  // each present meta cell, joined by separators (cells degrade when absent)
  const cells: React.ReactNode[] = [];
  if (issue.cat) cells.push(<CategoryLabel cat={issue.cat} />);
  cells.push(
    <span className="inline-flex items-center gap-2">
      <ImpactGauge value={issue.impact} />
      <span className="whitespace-nowrap">
        {t('{{level}} impact', { level: t(impactLevel(issue.impact)) })}
      </span>
    </span>,
  );
  if (onSetCritical || issue.critical)
    cells.push(
      <CriticalControl
        critical={issue.critical}
        onSet={onSetCritical}
        reasons={criticalReasons}
      />,
    );
  if (issue.seenAgoMin != null)
    cells.push(
      <span className="whitespace-nowrap">
        {t('last seen {{when}}', { when: lastSeenLabel(issue.seenAgoMin) })}
      </span>,
    );

  const meta = (
    <div className="flex items-center gap-3 text-sm flex-wrap color-gray-medium">
      {cells.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Sep />}
          {c}
        </React.Fragment>
      ))}
    </div>
  );

  const diagnosis = issue.problem ? (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-xs font-semibold uppercase color-gray-medium"
        style={{ letterSpacing: '0.05em' }}
      >
        {t('The problem')}
      </span>
      <span className="text-base color-gray-dark leading-relaxed">
        {issue.problem}
      </span>
    </div>
  ) : null;

  if (framed) {
    return (
      <div className="flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">{title}</div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        <div className="border-b" />
        <div className="px-4 py-4 flex flex-col gap-4">
          {meta}
          {!hideProblem && diagnosis}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">{title}</div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        {meta}
      </div>
      {!hideProblem && diagnosis}
    </div>
  );
}
