import { useStore } from '@/mstore';
import type { Filter } from '@/mstore/types/filterConstants';
import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { PagePanel } from '@/ui/layout/PageCard';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { CircleMinus, GripVertical, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  BREAKDOWN_GROUPS,
  MAX_BREAKDOWNS,
  breakdownGroup,
  breakdownName,
  buildBreakdownOptions,
} from './breakdownDimensions';

interface Props {
  metric: any;
  observeChanges?: () => void;
}

/** What a card's result is split by: a door while empty, a panel once set. */
function BreakdownFilter({ metric, observeChanges = () => {} }: Props) {
  const { t } = useTranslation();
  const { filterStore } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);

  const options: Filter[] = buildBreakdownOptions(
    filterStore.getCurrentProjectFilters(),
  );
  const names: string[] = (metric.breakdowns || []).map(breakdownName);
  const dims = names.map(
    (name) =>
      options.find((f) => f.name === name) ??
      ({ name, displayName: name, category: '' } as Filter),
  );
  const full = names.length >= MAX_BREAKDOWNS;
  const q = query.trim().toLowerCase();
  const shown = options.filter(
    (f) =>
      !q ||
      (f.displayName || f.name).toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q),
  );
  const groups = BREAKDOWN_GROUPS.map((g) => ({
    ...g,
    rows: shown.filter((f) => breakdownGroup(f) === g.key),
  })).filter((g) => g.rows.length > 0);

  const toggle = (f: Filter) => {
    const at = names.indexOf(f.name);
    if (at >= 0) metric.removeBreakdown(at);
    else if (!full) metric.addBreakdown(f);
    else return;
    observeChanges();
  };

  const door = (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      className="m-brk__menu"
      content={
        <div>
          <PopoverSearch
            placeholder={t('Break down by')}
            value={query}
            onChange={setQuery}
            autoFocus
          />
          <div className="m-brk__list">
            {groups.map((g) => (
              <section
                key={g.key}
                className="m-brk__group"
                aria-label={t(g.label)}
              >
                <h4 className="m-brk__group-head">{t(g.label)}</h4>
                {g.rows.map((f) => (
                  <CheckRow
                    key={f.name}
                    on={names.includes(f.name)}
                    disabled={full && !names.includes(f.name)}
                    onToggle={() => toggle(f)}
                  >
                    {f.displayName || f.name}
                  </CheckRow>
                ))}
              </section>
            ))}
            {shown.length === 0 && (
              <p className="m-brk__none">{t('No dimension matches that.')}</p>
            )}
          </div>
        </div>
      }
    >
      <span>
        <Tooltip
          title={
            full
              ? t('At most {{n}} breakdowns', { n: MAX_BREAKDOWNS })
              : names.length
                ? t('Add a breakdown')
                : t('Add a property to break down results by')
          }
        >
          <span>
            <Button
              variant="subtle"
              className="m-cardp__addseries"
              disabled={full}
              aria-label={t('Add breakdown')}
            >
              <Plus size={13} />
              {t('Add breakdown')}
            </Button>
          </span>
        </Tooltip>
      </span>
    </PopoverPanel>
  );

  if (names.length === 0) {
    return (
      <div className="m-cardp__bdoor">
        <span className="m-brk m-brk--door">{door}</span>
      </div>
    );
  }

  const drop = () => {
    if (drag && drag.from !== drag.over) {
      metric.moveBreakdown(drag.from, drag.over);
      observeChanges();
    }
    setDrag(null);
  };

  return (
    <div className="m-brk">
      <PagePanel
        head={<span className="m-pa__head-title">{t('Breakdown')}</span>}
      >
        <div className="m-brk__body">
          <ul className="m-brk__dims">
            {dims.map((d, i) => (
              <li
                key={d.name}
                className={`m-brk__dim${drag?.over === i && drag.from !== i ? ' is-over' : ''}`}
                draggable={dims.length > 1}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  setDrag({ from: i, over: i });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag((s) => (s ? { ...s, over: i } : s));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  drop();
                }}
                onDragEnd={() => setDrag(null)}
              >
                {dims.length > 1 ? (
                  <GripVertical
                    size={12}
                    className="m-brk__grip"
                    aria-hidden="true"
                  />
                ) : null}
                {d.category ? (
                  <>
                    <span className="m-brk__cat">{d.category}</span>
                    <span className="m-brk__dot" aria-hidden="true">
                      ·
                    </span>
                  </>
                ) : null}
                <span className="m-brk__name">{d.displayName || d.name}</span>
                <button
                  type="button"
                  className="m-brk__remove"
                  onClick={() => {
                    metric.removeBreakdown(i);
                    observeChanges();
                  }}
                  aria-label={t('Remove {{name}}', {
                    name: d.displayName || d.name,
                  })}
                >
                  <CircleMinus size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="m-cardp__form-foot">{door}</div>
        </div>
      </PagePanel>
    </div>
  );
}

export default observer(BreakdownFilter);
