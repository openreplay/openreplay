import { Truncated } from '@/ui/data/truncated';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Input } from '@/ui/inputs/input';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ArrowRightToLine, CornerDownLeft } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { valueLabelOf } from './catalogue';
import { ValueSourceContext, useValueOptions } from './data';
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
  const shared = options.some((o) => o.share != null);
  const { shareLabel, limit } = useContext(ValueSourceContext) ?? {};
  const atLimit = limit != null && value.length >= limit;
  const labelOf = (v: string) => valueLabelOf(t, entry, v);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!atLimit) onChange([...value, v]);
  };

  const acceptFirst = () => {
    const first = options[0].value;
    if (!value.includes(first) && !atLimit) onChange([...value, first]);
    setQuery('');
  };

  const commitTyped = () => {
    const typed = query
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !value.includes(s));
    const room = limit == null ? typed.length : limit - value.length;
    if (!typed.length || room <= 0) return;
    onChange([...value, ...typed.slice(0, room)]);
    setQuery(typed.slice(room).join(', '));
  };

  const label =
    value.length === 0
      ? t('value')
      : entry.valuesLabel
        ? entry.valuesLabel(t, value)
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
            if (e.key === 'Tab' && !e.shiftKey && options.length) {
              e.preventDefault();
              return acceptFirst();
            }
            if (e.key !== 'Enter') return;
            if (freeText) return commitTyped();
            if (options.length === 1) toggle(options[0].value);
          }}
          aria-label={t('Values for {{name}}', { name })}
        />
        {freeText && query.trim() && !atLimit && (
          <button type="button" className="m-vp__commit" onClick={commitTyped}>
            <CornerDownLeft size={12} aria-hidden="true" />
            {t('use “{{value}}”', { value: query.trim() })}
          </button>
        )}
      </div>

      <div className="m-vp__body">
        {atLimit && (
          <p className="m-vp__none">
            {t(
              'A filter holds up to {{n}} values. Remove one to add another.',
              {
                n: limit,
              },
            )}
          </p>
        )}
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

        {options.length === 0 && (loading || !freeText) && (
          <p className="m-vp__none">
            {loading ? t('Loading…') : t('Nothing matches that.')}
          </p>
        )}

        {options.map((o, i) => (
          <CheckRow
            key={o.value}
            on={value.includes(o.value)}
            disabled={atLimit && !value.includes(o.value)}
            onToggle={() => toggle(o.value)}
            meta={
              i === 0 || shared ? (
                <kbd
                  className={`m-vp__key${i > 0 ? ' is-slot' : ''}`}
                  aria-hidden="true"
                >
                  <ArrowRightToLine size={10} />
                  Tab
                </kbd>
              ) : undefined
            }
          >
            {o.share != null ? (
              <Tooltip
                title={
                  shareLabel
                    ? shareLabel(Math.round(o.share * 100))
                    : t('{{pct}}% of sessions', {
                        pct: Math.round(o.share * 100),
                      })
                }
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
            value.length > 2 && !entry.valuesLabel ? (
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
