import { Globe, Split } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import type { Issue } from '../shared/model';

/* Segment identity on the issue page + replay panel (Mehdi 07-20, design
   Gabriel 07-21).

   · `SegmentChip` — THE one look for a named segment, everywhere.
   · `FoundInChips` — the issue header's origin line: the segment that surfaced
     the issue (or full traffic). Clicking the segment chip scopes the example
     sessions to it (mirrored to ?seg=).
   · The sessions-toolbar scope control is the list's own `SegmentFilter`
     dropdown (TagFilter.tsx), reused verbatim (Mehdi 07-28) — same grammar.

   Scope = SESSIONS ONLY: headline stats stay global. State lives in
   `issuesStore.detailScope`, mirrored to ?seg= so a scoped view is shareable.

   The issue's segment membership is real now (`Issue.segmentIds`), so
   `FoundInChips` lists every segment the issue was found in; each chip toggles
   that segment into the sessions scope. */

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

/** Issue header origin line — the segments that surfaced the issue, or full
 *  traffic. Each segment chip toggles it into the example-sessions scope. */
export const FoundInChips = observer(function FoundInChips({
  issue,
}: {
  issue: Issue;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const ids = issue.segmentIds;

  const toggle = (id: string) => {
    issuesStore.toggleDetailScope(id);
    syncScopeToUrl(issuesStore.detailScope);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="color-gray-medium">{t('Found in:')}</span>
      {ids.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 color-gray-medium">
          <Globe size={12} /> {t('full traffic')}
        </span>
      ) : (
        ids.map((id) => (
          <SegmentChip
            key={id}
            name={issuesStore.segmentName(id) ?? id}
            on={issuesStore.detailScope.includes(id)}
            onClick={() => toggle(id)}
          />
        ))
      )}
    </div>
  );
});
