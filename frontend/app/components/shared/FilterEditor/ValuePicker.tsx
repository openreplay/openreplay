import { Truncated } from '@/ui/data/truncated';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Input } from '@/ui/inputs/input';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { CornerDownLeft } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useValueOptions } from './data';
import type { SearchFilter } from './types';
import './value-picker.css';

export interface ValuePickerProps {
  filter: SearchFilter;
  value: readonly string[];
  onChange: (values: string[]) => void;
  live?: boolean;
}

function ValuePicker({ filter, value, onChange, live }: ValuePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { entry } = filter;
  const name = entry.displayName;
  const freeText = !entry.options;
  const { options, loading } = useValueOptions(filter, query, open, live);
  const labelOf = (v: string) =>
    entry.options?.find((o) => o.value === v)?.label ?? v;

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const commitTyped = () => {
    const typed = query
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !value.includes(s));
    if (!typed.length) return;
    onChange([...value, ...typed]);
    setQuery('');
  };

  const label =
    value.length === 0
      ? t('value')
      : value.length <= 2
        ? value.map(labelOf).join(', ')
        : `${labelOf(value[0])} +${value.length - 1}`;

  const content = (
    <div className="m-vp">
      <div className="m-vp__search">
        <Input
          variant="bare"
          autoFocus
          className="min-w-0 flex-1"
          placeholder={
            freeText
              ? t('Search or type a {{name}}', { name: name.toLowerCase() })
              : t('Search {{name}}', { name: name.toLowerCase() })
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setOpen(false);
            if (e.key !== 'Enter') return;
            if (options.length === 1 && !query.includes(','))
              return toggle(options[0].value);
            if (freeText) commitTyped();
          }}
          aria-label={t('Values for {{name}}', { name })}
        />
        {freeText && query.trim() && (
          <button type="button" className="m-vp__commit" onClick={commitTyped}>
            <CornerDownLeft size={12} aria-hidden="true" />
            {t('use “{{value}}”', { value: query.trim() })}
          </button>
        )}
      </div>

      <div className="m-vp__body">
        {value
          .filter((v) => !options.some((o) => o.value === v))
          .map((v) => (
            <CheckRow
              key={`extra:${v}`}
              on
              onToggle={() => toggle(v)}
              meta={<span className="m-vp__typed">{t('typed')}</span>}
            >
              {labelOf(v)}
            </CheckRow>
          ))}

        {options.length === 0 && (
          <p className="m-vp__none">
            {loading
              ? t('Loading…')
              : freeText
                ? t('Type a {{name}} to filter by it.', {
                    name: name.toLowerCase(),
                  })
                : t('Nothing matches that.')}
          </p>
        )}

        {options.map((o) => (
          <CheckRow
            key={o.value}
            on={value.includes(o.value)}
            onToggle={() => toggle(o.value)}
          >
            {o.share != null ? (
              <Tooltip
                title={t('{{pct}}% of sessions', {
                  pct: Math.round(o.share * 100),
                })}
                delay={300}
              >
                <span className="m-vp__opt">
                  <Truncated text={o.label} />
                  <span
                    className="m-vp__line"
                    aria-hidden="true"
                    style={{
                      width: `${Math.max(2, Math.round(o.share * 100))}%`,
                    }}
                  />
                </span>
              </Tooltip>
            ) : (
              <span className="m-vp__opt">
                <Truncated text={o.label} />
              </span>
            )}
          </CheckRow>
        ))}
      </div>
    </div>
  );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      sideOffset={5}
      className="m-vp-host"
      content={content}
    >
      <button
        type="button"
        className={`m-vp__trigger${value.length ? ' is-set' : ''}`}
        aria-label={t('Values for {{name}}', { name })}
      >
        <Truncated
          text={label}
          full={
            value.length > 2 ? (
              <span className="m-vp__all">
                {value.map((v) => (
                  <span key={v}>{labelOf(v)}</span>
                ))}
              </span>
            ) : undefined
          }
        />
      </button>
    </PopoverPanel>
  );
}

export default observer(ValuePicker);
