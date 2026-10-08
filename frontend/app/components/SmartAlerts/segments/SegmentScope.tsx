import { Globe, Split } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import type { Issue } from '../shared/model';
import './segment-chip.css';

/* Segment identity on the issue page + replay panel.
   · `SegmentChip` — the one look for a named segment, everywhere.
   · `FoundInChips` — the issue's origin line: the segments that surfaced it
     (or full traffic); each chip toggles that segment into the sessions scope.
   Scope is sessions-only (state in `issuesStore.detailScope`, mirrored to ?seg=). */

/** The segment chip — interactive when `onClick` is given. */
export function SegmentChip({
  name,
  on = false,
  onClick,
}: {
  name: string;
  on?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Split size={11} aria-hidden="true" />
      <span className="m-truncate">{name}</span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`m-segchip${on ? ' is-on' : ''}`}
    >
      {content}
    </button>
  ) : (
    <span className="m-segchip is-static">{content}</span>
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
    <span className="inline-flex flex-wrap items-center gap-2">
      {ids.length === 0 ? (
        <span className="m-segchip is-static">
          <Globe size={11} aria-hidden="true" />
          {t('Full traffic')}
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
    </span>
  );
});
