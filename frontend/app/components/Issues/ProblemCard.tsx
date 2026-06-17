import React from 'react';
import { Tooltip } from 'antd';
import { WarningFilled } from '@ant-design/icons';
import { Icon } from 'UI';
import {
  type Issue,
  type CategoryName,
  CAT_ICON,
  impactLevel,
  IMPACT_FILLED,
  IMPACT_COLOR,
  lastSeenLabel,
} from 'App/mstore/issuesStore';

/* AiSummary — the reusable "what happened" AI textbox (Mehdi: a component to
   highlight what happened). Two variants:
   - primary: the full AI card (tinted surface + "AI summary" label). Used for
     the issue description, the most important block on the page.
   - secondary: just the AI text with a small sparkles mark, no surface. Used for
     each session's plain-language description. */
export function AiSummary({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  if (variant === 'secondary') {
    return (
      <div
        className="flex items-start gap-1.5 text-sm"
        style={{ color: 'var(--color-gray-dark)', lineHeight: 1.55 }}
      >
        <Icon
          name="sparkles"
          size={13}
          className="shrink-0"
          style={{ marginTop: 3 }}
        />
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1.5"
      style={{
        background: 'linear-gradient(156deg, #F3F4FF 0%, #F1F8F8 100%)',
        border: '1px solid var(--color-gray-light)',
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon name="sparkles" size={14} />
        <span className="text-xs font-semibold text-main">AI summary</span>
      </span>
      <div style={{ color: 'var(--color-gray-dark)', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function ImpactGauge({ value }: { value: number }) {
  const level = impactLevel(value);
  const filled = IMPACT_FILLED[level];
  const color = IMPACT_COLOR[level];
  return (
    <span className="inline-flex items-center" style={{ gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 14,
            borderRadius: 2,
            background:
              i < filled
                ? color
                : 'color-mix(in srgb, var(--color-gray-light) 55%, white)',
          }}
        />
      ))}
    </span>
  );
}

/* Category as the same icon + text the issues list uses (not a colored pill). */
export function CategoryLabel({ cat }: { cat: CategoryName }) {
  const Ic = CAT_ICON[cat];
  return (
    <span className="inline-flex items-center" style={{ gap: 6 }}>
      <Ic size={15} style={{ color: 'var(--color-gray-medium)' }} />
      <span className="text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
        {cat}
      </span>
    </span>
  );
}

interface Props {
  issue: Issue;
}

function ProblemCard({ issue }: Props) {
  const level = impactLevel(issue.impact);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {issue.critical && (
          <Tooltip title="Critical">
            <WarningFilled style={{ color: 'var(--color-red)', fontSize: 16 }} />
          </Tooltip>
        )}
        <span
          className="text-lg font-semibold"
          style={{ color: 'var(--color-gray-darkest)', lineHeight: 1.3 }}
        >
          {issue.head}
        </span>
        <CategoryLabel cat={issue.cat} />
        <span
          className="ml-auto flex items-center gap-2 text-xs whitespace-nowrap"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          <ImpactGauge value={issue.impact} />
          {level} impact · last seen {lastSeenLabel(issue.seenAgoMin)}
        </span>
      </div>

      <AiSummary>{issue.real}</AiSummary>
    </div>
  );
}

export default ProblemCard;
