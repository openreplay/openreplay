import { useHeadSearchSlot } from '@/ui/layout/PageCard';
import { Filter } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { FilterPanel } from './FilterPanel';
import { TorchRing } from './TorchRing';
import './filter-bar.css';
import type { CatalogueEntry } from './types';

const HOTKEY =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform ?? '')
    ? '⌘K'
    : 'Ctrl K';

export interface EntryFieldProps {
  entries: readonly CatalogueEntry[];
  taken: readonly string[];
  onPick: (entry: CatalogueEntry) => void;
  hasRules: boolean;
  /** The first-rule prompt; defaults to the recordings wording. */
  placeholder?: string;
  /** controls at the right end of the field's line */
  trailing?: ReactNode;
  /** right after the field, on its line */
  after?: ReactNode;
  /** the phone's door: a button in the field's look that opens the filter
      drawer, where the rules are edited */
  opens?: { onOpen: () => void; summary?: ReactNode; count?: number };
}

/** The search field under a page title; typing opens the catalogue. */
export function EntryField({
  entries,
  taken,
  onPick,
  hasRules,
  placeholder,
  trailing,
  after,
  opens,
}: EntryFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const commitRef = useRef<(() => void) | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const lead = hasRules
    ? t('Add to the filter')
    : (placeholder ?? t('Search recordings'));
  // the compact header's seat, when the page has one
  const headSlot = useHeadSearchSlot();

  useEffect(() => {
    if (hasRules || opens) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))
      )
        return;
      e.preventDefault();
      input.current?.focus();
      setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hasRules, opens]);

  if (opens)
    return (
      <div className="m-recs__entryfield" data-trigger="bar">
        <div className="m-fbar__triggerwrap">
          <button
            type="button"
            className="m-fbar__filter m-fbar__filter--bar m-fbar__opens"
            onClick={opens.onOpen}
            aria-label={
              opens.count
                ? t('{{lead}}, {{n}} applied', { lead, n: opens.count })
                : lead
            }
          >
            <Filter
              size={16}
              className="m-fbar__filter-glyph"
              aria-hidden="true"
            />
            {opens.summary ?? (
              <span className="m-fbar__opens-lead">{lead}</span>
            )}
            {!!opens.count && (
              <span
                className="m-iconbtn__count m-fbar__opens-count"
                aria-hidden="true"
              >
                {opens.count}
              </span>
            )}
          </button>
        </div>
        {after}
        {trailing && <span className="m-recs__entry-trailing">{trailing}</span>}
      </div>
    );

  const field = (
    <div className="m-recs__entryfield" data-trigger="bar">
      <div className="m-fbar__triggerwrap" ref={wrap}>
        <label className="m-fbar__filter m-fbar__filter--bar">
          <TorchRing />
          <Filter
            size={14}
            className="m-fbar__filter-glyph"
            aria-hidden="true"
          />
          <input
            ref={input}
            type="text"
            className="m-fbar__input"
            value={query}
            placeholder={lead}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                close();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (!open) setOpen(true);
                else commitRef.current?.();
              } else if (e.key === 'ArrowDown' && !open) {
                e.preventDefault();
                setOpen(true);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-autocomplete="list"
            aria-label={lead}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="m-fbar__key" aria-hidden="true">
            {HOTKEY}
          </kbd>
        </label>
        <FilterPanel
          open={open}
          query={query}
          onQueryChange={setQuery}
          hideSearch
          commitRef={commitRef}
          onClose={close}
          onPick={(e) => {
            onPick(e);
            close();
          }}
          taken={taken}
          entries={entries}
          anchorRef={wrap}
        />
      </div>
      {after}
      {trailing && <span className="m-recs__entry-trailing">{trailing}</span>}
    </div>
  );
  return headSlot ? createPortal(field, headSlot) : field;
}
