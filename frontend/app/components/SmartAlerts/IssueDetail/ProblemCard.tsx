import React from 'react';

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
  onSetCritical?: (val: boolean, reason?: string) => void;
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
  actions,
  framed,
  hideProblem,
}: Props) {
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
        {impactLevel(issue.impact)} impact
      </span>
    </span>,
  );
  if (onSetCritical || issue.critical)
    cells.push(
      <CriticalControl critical={issue.critical} onSet={onSetCritical} />,
    );
  if (issue.seenAgoMin != null)
    cells.push(
      <span className="whitespace-nowrap">
        last seen {lastSeenLabel(issue.seenAgoMin)}
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

  const diagnosis = issue.real ? (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-xs font-semibold uppercase color-gray-medium"
        style={{ letterSpacing: '0.05em' }}
      >
        The problem
      </span>
      <span className="text-base color-gray-dark leading-relaxed">
        {issue.real}
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
