import { Button, Popover } from 'antd';
import { ChevronDown, Globe, Split } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { CheckRow } from '../IssueList/TagFilter';
import type { Issue } from '../shared/model';

/* Segment identity on the issue page + replay panel (Mehdi 07-20, design
   Gabriel 07-21).

   `SegmentChip` is THE one look for a named segment, everywhere. `FoundInChips`
   is the issue header's origin line: which segment surfaced the issue (or full
   traffic).

   NOTE(not-yet-backed): the designer's interactive scope (pick several of an
   issue's segments to filter the example sessions, mirrored to ?seg= in the
   URL) needs per-issue segment membership + per-session segment data the
   backend doesn't return yet — today an issue carries a single surfacing
   `segmentId`. So FoundInChips renders the surfacing segment read-only; wire up
   the interactive scope once that data lands. */

/** THE segment chip — one look everywhere a segment is named. Interactive when
 *  `onClick` is given. */
export function SegmentChip({
  name,
  on = false,
  onClick,
}: {
  name: string;
  on?: boolean;
  onClick?: () => void;
}) {
  const className =
    'inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 transition-colors';
  const style: React.CSSProperties = on
    ? {
        color: 'var(--color-main)',
        borderColor: 'var(--color-main)',
        background: 'var(--color-active-blue)',
      }
    : { color: 'var(--color-gray-darkest)' };
  const icon = (
    <Split
      size={12}
      style={{ color: on ? 'var(--color-main)' : 'var(--color-gray-medium)' }}
    />
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} cursor-pointer`}
      style={style}
    >
      {icon}
      {name}
    </button>
  ) : (
    <span className={`${className} cursor-default`} style={style}>
      {icon}
      {name}
    </span>
  );
}

/** write the current scope into the URL without a navigation */
export const syncScopeToUrl = (ids: string[]) => {
  const url = new URL(window.location.href);
  if (ids.length) url.searchParams.set('seg', ids.join(','));
  else url.searchParams.delete('seg');
  window.history.replaceState(null, '', url.toString());
};

/** Issue header origin line — the segment that surfaced the issue, or full
 *  traffic. Read-only until per-issue segment membership is backed. */
export const FoundInChips = observer(function FoundInChips({
  issue,
}: {
  issue: Issue;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const name = issuesStore.segmentName(issue.segmentId);

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="color-gray-medium">{t('Found in:')}</span>
      {issue.segmentId == null ? (
        <span className="inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 color-gray-medium">
          <Globe size={12} /> {t('full traffic')}
        </span>
      ) : (
        <SegmentChip name={name ?? issue.segmentId} />
      )}
    </div>
  );
});

/* Sessions-toolbar control on the issue page: scope the example-sessions sample
   to one or more segments (SESSIONS ONLY — headline stats stay global). Same
   stable-trigger grammar as the list's Tags dropdown. Options are the project's
   visible segments; the search endpoint filters the sample by segmentIds.
   NOTE(not-yet-backed): per-issue segment membership isn't returned yet, so the
   options are the project segments, not just this issue's. */
export const SegmentScopeFilter = observer(function SegmentScopeFilter() {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const rows = issuesStore.originSegments;
  const scoped = issuesStore.detailScope;

  if (rows.length === 0) return null;

  const toggle = (id: string) => {
    issuesStore.toggleDetailScope(id);
    syncScopeToUrl(issuesStore.detailScope);
  };
  const clear = () => {
    issuesStore.clearDetailScope();
    syncScopeToUrl([]);
  };

  const label =
    scoped.length === 0
      ? t('All segments')
      : scoped.length === 1
        ? t('Segment: {{name}}', {
            name: issuesStore.segmentById(scoped[0])?.name ?? '…',
          })
        : t('Segments ({{count}})', { count: scoped.length });

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      classNames={{
        root: 'rounded-lg border border-gray-200 shadow-xs overflow-hidden',
      }}
      content={
        <div className="flex flex-col gap-0.5 w-64">
          {rows.map((s) => (
            <CheckRow
              key={s.id}
              on={scoped.includes(s.id)}
              onClick={() => toggle(s.id)}
            >
              {s.name}
            </CheckRow>
          ))}
          {scoped.length > 0 && (
            <>
              <div className="border-t my-1" />
              <Button
                type="text"
                size="small"
                onClick={clear}
                className="self-start"
              >
                {t('Clear')}
              </Button>
            </>
          )}
        </div>
      }
    >
      <Button
        size="small"
        className={scoped.length ? '!border-main !text-main' : undefined}
      >
        <span className="flex items-center gap-1.5">
          <Split size={13} />
          {label}
          <ChevronDown size={13} className="opacity-60" />
        </span>
      </Button>
    </Popover>
  );
});
