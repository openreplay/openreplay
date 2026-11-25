import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** One combination of breakdown values and its count. */
export interface BreakdownPart {
  values: string[];
  count: number;
}

const fmt = (n: number) => n.toLocaleString();
const pctOf = (part: number, whole: number) => {
  const x = whole ? (part / whole) * 100 : 0;
  if (x >= 10) return `${Math.round(x)}%`;
  return x >= 0.1 ? `${Math.round(x * 10) / 10}%` : '<0.1%';
};
const labelOf = (p: BreakdownPart) => p.values.join(' · ');
const widthOf = (count: number, scale: number) =>
  `${Math.max(0.75, scale ? (count / scale) * 100 : 0)}%`;

function useShown(parts: readonly BreakdownPart[], topN: number) {
  const [all, setAll] = useState(false);
  const limit = topN > 0 ? Math.min(topN, parts.length) : parts.length;
  const shown = all ? parts : parts.slice(0, limit);
  return {
    shown,
    limit,
    all,
    rest: parts.length - shown.length,
    folds: parts.length > limit,
    toggle: () => setAll((v) => !v),
  };
}

function MoreToggle({
  all,
  rest,
  limit,
  inert,
  onToggle,
}: {
  all: boolean;
  rest: number;
  limit: number;
  inert?: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  if (inert) {
    return (
      <span className="m-subs__more-text">
        {t('+{{count}} more', { count: rest })}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="m-subs__more-btn"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {all
        ? t('Top {{n}} only', { n: limit })
        : t('+{{count}} more', { count: rest })}
    </button>
  );
}

/** A funnel step's count split by the breakdown, under its bar. */
export function SubBars({
  parts,
  scale,
  parent,
  topN,
  unit,
  bars = true,
  inert,
}: {
  parts: readonly BreakdownPart[];
  /** the count a full-width bar stands for */
  scale: number;
  /** the count the parts split; shares are of this */
  parent: number;
  /** shown before "+N more"; 0 shows all */
  topN: number;
  unit: string;
  /** false: figures only, the bars stand beside the step (SubColumns) */
  bars?: boolean;
  inert?: boolean;
}) {
  const { t } = useTranslation();
  const { shown, limit, all, rest, folds, toggle } = useShown(parts, topN);
  return (
    <ul
      className={`m-subs${bars ? '' : ' is-figures'}`}
      aria-label={t('Breakdown')}
    >
      {shown.map((p) => (
        <li
          key={labelOf(p)}
          className="m-subs__item"
          aria-label={`${labelOf(p)}: ${fmt(p.count)} ${unit}, ${pctOf(p.count, parent)}`}
        >
          <span className="m-subs__head">
            <span className="m-subs__label m-truncate" title={labelOf(p)}>
              {p.values.map((v, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="m-subs__sep"> · </span>}
                  {v}
                </React.Fragment>
              ))}
            </span>
            <span className="m-subs__figs">
              <span className="m-subs__count">{fmt(p.count)}</span>
              <span className="m-subs__pct">{pctOf(p.count, parent)}</span>
            </span>
          </span>
          {bars && (
            <span className="m-subs__bar" aria-hidden="true">
              <i style={{ width: widthOf(p.count, scale) }} />
            </span>
          )}
        </li>
      ))}
      {folds && (
        <li className="m-subs__more">
          <MoreToggle
            all={all}
            rest={rest}
            limit={limit}
            inert={inert}
            onToggle={toggle}
          />
        </li>
      )}
    </ul>
  );
}

/** The parts as thin columns beside a funnel step's column. */
export function SubColumns({
  parts,
  scale,
  topN,
}: {
  parts: readonly BreakdownPart[];
  scale: number;
  topN: number;
}) {
  const shown = topN > 0 ? parts.slice(0, topN) : parts;
  return (
    <span className="m-subs__cols" aria-hidden="true">
      {shown.map((p) => (
        <span
          key={labelOf(p)}
          className="m-subs__col"
          title={`${labelOf(p)}: ${fmt(p.count)}`}
        >
          <i
            style={{
              height: `${Math.max(1, scale ? (p.count / scale) * 100 : 0)}%`,
            }}
          />
        </span>
      ))}
    </span>
  );
}

/** A ranked table row's parts, as rows of the table's own grid. */
export function SubRows({
  parts,
  scale,
  parent,
  topN,
  unit,
  inert,
  rank,
}: {
  parts: readonly BreakdownPart[];
  scale: number;
  parent: number;
  topN: number;
  unit: string;
  inert?: boolean;
  rank?: boolean;
}) {
  const { shown, limit, all, rest, folds, toggle } = useShown(parts, topN);
  const cls = `m-top__sub${rank ? ' has-rank' : ''}`;
  return (
    <>
      {shown.map((p) => (
        <li
          key={labelOf(p)}
          className={cls}
          aria-label={`${labelOf(p)}: ${fmt(p.count)} ${unit}, ${pctOf(p.count, parent)}`}
        >
          {rank && <span />}
          <span />
          <span className="m-top__sub-label m-truncate" title={labelOf(p)}>
            {labelOf(p)}
          </span>
          <span className="m-top__sub-bar" aria-hidden="true">
            <i style={{ width: widthOf(p.count, scale) }} />
          </span>
          <span className="m-top__sub-value">
            {fmt(p.count)}
            <span className="m-top__sub-pct">{pctOf(p.count, parent)}</span>
          </span>
        </li>
      ))}
      {folds && (
        <li className={`${cls} is-more`}>
          {rank && <span />}
          <span />
          <MoreToggle
            all={all}
            rest={rest}
            limit={limit}
            inert={inert}
            onToggle={toggle}
          />
        </li>
      )}
    </>
  );
}
