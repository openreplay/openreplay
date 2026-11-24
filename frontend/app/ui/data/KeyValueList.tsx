import { CopyButton } from '@/ui/actions/CopyButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from '@/ui/actions/dropdown-menu';
import { SearchField } from '@/ui/inputs/SearchField';
import { ChevronRight, CircleMinus, ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Highlight, holds } from './Highlight';
import './key-value-list.css';

export interface KeyValueItem {
  key: string;
  value: string;
  tone?: 'danger' | 'warning';
  block?: boolean;
  state?: 'in' | 'out';
  menu?: readonly MenuItem[];
}

export interface KeyValueGroup {
  id: string;
  title: string;
  items: readonly KeyValueItem[];
  folded?: boolean;
}

export interface KeyValueListProps {
  groups: readonly KeyValueGroup[];
  query: string;
  onQuery: (query: string) => void;
  searchPlaceholder?: string;
}

const BLOCK_LINES = 6;

export function KeyValueList({
  groups,
  query,
  onQuery,
  searchPlaceholder,
}: KeyValueListProps) {
  const { t } = useTranslation();
  const [folded, setFolded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, !!g.folded])),
  );
  const searching = query.trim() !== '';
  const shown = groups.map((g) => ({
    ...g,
    items: g.items.filter((i) => holds(i.key, query) || holds(i.value, query)),
  }));
  const none = searching && shown.every((g) => g.items.length === 0);

  return (
    <div className="m-kv">
      <div className="m-kv__search">
        <SearchField
          size="sm"
          placeholder={searchPlaceholder ?? t('Search keys and values')}
          value={query}
          onChange={onQuery}
        />
      </div>
      {none && (
        <p className="m-kv__empty">
          {t('Nothing matches “{{q}}”', { q: query.trim() })}
        </p>
      )}
      {shown.map((g) => {
        if (searching && g.items.length === 0) return null;
        const open = searching || !folded[g.id];
        return (
          <section key={g.id} className="m-kv__group" aria-label={g.title}>
            <button
              type="button"
              className="m-kv__head"
              aria-expanded={open}
              disabled={searching}
              onClick={() => setFolded((f) => ({ ...f, [g.id]: !f[g.id] }))}
            >
              <ChevronRight
                size={13}
                className="m-kv__caret"
                aria-hidden="true"
              />
              <span className="m-kv__title">{g.title}</span>
              <span className="m-kv__count">{g.items.length}</span>
            </button>
            {open && (
              <div className="m-kv__rows" role="list">
                {g.items.map((it) => (
                  <Row key={it.key} item={it} query={query} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function KeyName({ name, query }: { name: string; query: string }) {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return <Highlight text={name} query={query} />;
  return (
    <>
      <span className="m-kv__path">
        <Highlight text={name.slice(0, dot + 1)} query={query} />
      </span>
      <Highlight text={name.slice(dot + 1)} query={query} />
    </>
  );
}

function Row({ item, query }: { item: KeyValueItem; query: string }) {
  const { t } = useTranslation();
  if (item.block) return <BlockRow item={item} query={query} />;
  const cls = `m-kv__row${item.state ? ` is-${item.state}` : ''}`;
  const inner = (
    <>
      <span className="m-kv__key" title={item.key}>
        <KeyName name={item.key} query={query} />
      </span>
      <span className={`m-kv__value${item.tone ? ` is-${item.tone}` : ''}`}>
        <Highlight text={item.value} query={query} />
      </span>
      {item.state === 'out' ? (
        <CircleMinus
          size={13}
          className="m-kv__glyph"
          aria-label={t('Left out of the search')}
        />
      ) : (
        <ListFilter
          size={13}
          className="m-kv__glyph"
          aria-label={item.state === 'in' ? t('In the search') : undefined}
          aria-hidden={item.state !== 'in'}
        />
      )}
    </>
  );
  if (!item.menu?.length) {
    return (
      <div className={`${cls} is-static`} role="listitem">
        {inner}
      </div>
    );
  }
  return (
    <div role="listitem">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cls}>
            {inner}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="m-kv__menu">
          <DropdownMenuItems items={item.menu} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function BlockRow({ item, query }: { item: KeyValueItem; query: string }) {
  const { t } = useTranslation();
  const lines = item.value.split('\n');
  const [all, setAll] = useState(false);
  const clamped = !all && lines.length > BLOCK_LINES;
  return (
    <div className="m-kv__row is-block" role="listitem">
      <span className="m-kv__key" title={item.key}>
        <KeyName name={item.key} query={query} />
      </span>
      <span className="m-kv__copy">
        <CopyButton
          variant="ghost"
          size="xs"
          text={item.value}
          label={t('Copy {{name}}', { name: item.key })}
        />
      </span>
      <pre className={`m-kv__block${item.tone ? ` is-${item.tone}` : ''}`}>
        <Highlight
          text={clamped ? lines.slice(0, BLOCK_LINES).join('\n') : item.value}
          query={query}
        />
      </pre>
      {lines.length > BLOCK_LINES && (
        <button
          type="button"
          className="m-kv__more"
          onClick={() => setAll((v) => !v)}
        >
          {all
            ? t('Show less')
            : t('Show all {{n}} lines', { n: lines.length })}
        </button>
      )}
    </div>
  );
}
