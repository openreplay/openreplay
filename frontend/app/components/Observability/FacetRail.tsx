import { IconButton } from '@/ui/actions/IconButton';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { SearchField } from '@/ui/inputs/SearchField';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown, ListPlus, PanelLeftClose, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { compactCount } from './logs-logic';

export interface FacetValue {
  value: string;
  count: number;
  on: boolean;
}

export interface FacetRailProps {
  facets: readonly {
    key: string;
    label: string;
    values: readonly FacetValue[];
    loading?: boolean;
  }[];
  onToggle: (key: string, value: string) => void;
  onClearFacet: (key: string) => void;
  onHide: () => void;
  facetKeys: readonly string[];
  onFacetKeys: (keys: string[]) => void;
  choices: readonly { key: string; label: string }[];
}

const SHOWN = 6;

export function FacetRail({
  facets,
  onToggle,
  onClearFacet,
  onHide,
  facetKeys,
  onFacetKeys,
  choices,
}: FacetRailProps) {
  const { t } = useTranslation();
  return (
    <aside className="m-logs__rail" aria-label={t('Facets')}>
      <div className="m-logs__rail-head">
        <span>{t('Facets')}</span>
        <FacetPicker
          facetKeys={facetKeys}
          onFacetKeys={onFacetKeys}
          choices={choices}
        />
        <span className="m-logs__rail-hide">
          <IconButton
            icon={<PanelLeftClose size={14} />}
            label={t('Hide the facets')}
            variant="ghost"
            size="xs"
            onClick={onHide}
          />
        </span>
      </div>
      {facets.map((f) => (
        <Facet
          key={f.key}
          facetKey={f.key}
          label={f.label}
          values={f.values}
          loading={f.loading}
          onToggle={onToggle}
          onClear={() => onClearFacet(f.key)}
        />
      ))}
    </aside>
  );
}

function FacetPicker({
  facetKeys,
  onFacetKeys,
  choices,
}: {
  facetKeys: readonly string[];
  onFacetKeys: (keys: string[]) => void;
  choices: readonly { key: string; label: string }[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const lower = q.trim().toLowerCase();
  const shown = choices.filter(
    (c) =>
      !lower ||
      c.label.toLowerCase().includes(lower) ||
      c.key.toLowerCase().includes(lower),
  );
  const content = (
    <div className="m-logs__facet-picker">
      <PopoverSearch placeholder={t('Search keys')} value={q} onChange={setQ} />
      <div
        className="m-logs__facet-picker-list"
        role="menu"
        aria-label={t('Facets')}
      >
        {shown.map((c) => {
          const on = facetKeys.includes(c.key);
          return (
            <CheckRow
              key={c.key}
              on={on}
              onToggle={() =>
                onFacetKeys(
                  on
                    ? facetKeys.filter((k) => k !== c.key)
                    : [...facetKeys, c.key],
                )
              }
            >
              {c.label}
            </CheckRow>
          );
        })}
        {shown.length === 0 && (
          <span className="m-logs__more">{t('No key matches')}</span>
        )}
      </div>
    </div>
  );
  return (
    <span className="m-logs__rail-pick">
      <PopoverPanel
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ('');
        }}
        placement="bottomLeft"
        content={content}
      >
        <IconButton
          icon={<ListPlus size={14} />}
          label={t('Choose facets')}
          variant="ghost"
          size="xs"
          open={open}
        />
      </PopoverPanel>
    </span>
  );
}

function Facet({
  facetKey,
  label,
  values,
  loading,
  onToggle,
  onClear,
}: {
  facetKey: string;
  label: string;
  values: readonly FacetValue[];
  loading?: boolean;
  onToggle: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  const picked = values.filter((v) => v.on).length;
  const searchable = values.length > 8;
  const lower = q.toLowerCase();
  const shown = (
    q ? values.filter((v) => v.value.toLowerCase().includes(lower)) : values
  ).slice(0, all || q ? undefined : SHOWN);
  const hidden = values.length - SHOWN;
  return (
    <section className={`m-logs__facet${open ? '' : ' is-closed'}`}>
      <div className="m-logs__facet-row">
        <button
          type="button"
          className="m-logs__facet-head"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={13} />
          <span className="m-truncate" title={label}>
            {label}
          </span>
        </button>
        {picked > 0 && (
          <button
            type="button"
            className="m-logs__facet-clear"
            onClick={onClear}
            aria-label={t('Clear {{label}}: {{n}} picked', {
              label,
              n: picked,
            })}
          >
            {t('{{n}} picked', { n: picked })}
            <X size={12} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <div className="m-logs__facet-body" role="menu" aria-label={label}>
          {searchable && (
            <SearchField
              size="sm"
              placeholder={t('Search {{label}}', {
                label: label.toLowerCase(),
              })}
              value={q}
              onChange={setQ}
            />
          )}
          {shown.map((v) => (
            <CheckRow
              key={v.value}
              on={v.on}
              onToggle={() => onToggle(facetKey, v.value)}
              meta={
                <span className={v.count === 0 ? 'is-zero' : undefined}>
                  {compactCount(v.count)}
                </span>
              }
            >
              {v.value}
            </CheckRow>
          ))}
          {shown.length === 0 && (
            <span className="m-logs__more">
              {loading
                ? t('Loading…')
                : q
                  ? t('Nothing matches “{{q}}”', { q })
                  : t('No values in this window')}
            </span>
          )}
          {!q && hidden > 0 && (
            <button
              type="button"
              className="m-logs__more"
              onClick={() => setAll((a) => !a)}
            >
              {all ? t('Fewer') : t('{{n}} more', { n: hidden })}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
