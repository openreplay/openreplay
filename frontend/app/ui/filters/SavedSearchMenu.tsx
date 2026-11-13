import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './saved-search-menu.css';

export interface SavedSearchItem {
  id: string;
  name: string;
  /** what it asks, as one line; the row's tooltip and searched too */
  sentence: string;
}

export interface SavedSearchMenuProps {
  items: readonly SavedSearchItem[];
  /** the one the search came from */
  activeId: string | null;
  /** the search has moved since that one was opened */
  edited: boolean;
  /** the trigger's word, always: the open one's name is the indicator's */
  label: string;
  searchPlaceholder: string;
  empty: string;
  noMatch: (q: string) => string;
  saveLabel: string;
  icon: ReactNode;
  canSave: boolean;
  onApply: (id: string) => void;
  onSave: () => void;
  /** given when the open one may be overwritten */
  onUpdate?: () => void;
  /** given when the open one may be deleted */
  onDelete?: () => void;
}

/** Saved searches at the end of the search row: a searchable list built for
    dozens, Save as at the start of the foot, Save changes and delete for the
    open one at its end. */
export function SavedSearchMenu({
  items,
  activeId,
  edited,
  label,
  searchPlaceholder,
  empty,
  noMatch,
  saveLabel,
  icon,
  canSave,
  onApply,
  onSave,
  onUpdate,
  onDelete,
}: SavedSearchMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !activeId) return undefined;
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      const row = list?.querySelector<HTMLElement>('[data-active="true"]');
      if (!list || !row) return;
      list.scrollTop = Math.max(
        0,
        row.offsetTop - (list.clientHeight - row.offsetHeight) / 2,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [open, activeId]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  const active = activeId ? items.find((i) => i.id === activeId) : undefined;
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(needle) ||
          i.sentence.toLowerCase().includes(needle),
      )
    : items;

  const content = (
    <div className="m-saved">
      <PopoverSearch
        placeholder={searchPlaceholder}
        label={searchPlaceholder}
        value={q}
        onChange={setQ}
        autoFocus
      />
      <div
        className="m-saved__list"
        role="menu"
        aria-label={label}
        ref={listRef}
      >
        {shown.map((i) => (
          <div
            key={i.id}
            data-active={i.id === activeId}
            className="m-saved__row"
            title={i.sentence}
          >
            <CheckRow
              single
              on={i.id === activeId}
              onToggle={() => {
                onApply(i.id);
                close();
              }}
            >
              <span className="m-truncate">{i.name}</span>
            </CheckRow>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="m-saved__none">
            {items.length === 0 ? empty : noMatch(q.trim())}
          </p>
        )}
      </div>
      <div className="m-saved__foot">
        <Button
          variant="subtle"
          // nothing new to keep while the search is the open one, untouched
          disabled={!canSave || (active != null && !edited)}
          onClick={() => {
            close();
            onSave();
          }}
        >
          <Plus size={13} />
          {saveLabel}
        </Button>
        {active && ((edited && onUpdate) || onDelete) && (
          <span className="m-saved__foot-end">
            {edited && onUpdate && (
              <Button
                onClick={() => {
                  close();
                  onUpdate();
                }}
              >
                {t('Save changes')}
              </Button>
            )}
            {onDelete && (
              <span className="m-saved__delete">
                <IconButton
                  icon={<Trash2 size={14} />}
                  label={t('Delete {{name}}', { name: active.name })}
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    close();
                    onDelete();
                  }}
                />
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
      placement="bottomRight"
      className="m-saved__pop"
      content={content}
    >
      <Button
        className="m-saved__trigger"
        aria-label={active ? `${label}, ${active.name}` : label}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={13} className="m-saved__caret" aria-hidden="true" />
      </Button>
    </PopoverPanel>
  );
}
