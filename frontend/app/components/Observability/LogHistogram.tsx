import { Button } from '@/ui/actions/button';
import { EChart, baseOption, useChartTheme } from '@/ui/data/chart';
import type * as echarts from 'echarts/core';
import type { TFunction } from 'i18next';
import { Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  type Bucket,
  LEVELS,
  type LogLevel,
  clockLabel,
  compactCount,
  levelLabel,
} from './logs-logic';

export interface LogHistogramProps {
  buckets: readonly Bucket[];
  step: number;
  levels: readonly LogLevel[];
  counts: Record<LogLevel, number>;
  onToggleLevel: (l: LogLevel) => void;
  onWindow: (from: number, to: number) => void;
  back?: { label: string; onBack: () => void };
  withDate: boolean;
  legendSlot?: HTMLElement | null;
}

const STEP_WORDS = (ms: number): string => {
  if (ms < 60_000) return `${ms / 1000}s`;
  if (ms < 3_600_000) return `${ms / 60_000} min`;
  if (ms < 86_400_000) return `${ms / 3_600_000} h`;
  return `${ms / 86_400_000} d`;
};
const lines = (t: TFunction, n: number) =>
  t('{{n}} lines', { n: compactCount(n), count: n });

const ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function useTween(target: number, ms = 220): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const start = useRef(0);
  useEffect(() => {
    const begin = shown;
    from.current = begin;
    start.current = performance.now();
    if (begin === target) return undefined;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from.current + (target - from.current) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return shown;
}

const sum = (bs: readonly Bucket[]): Record<LogLevel, number> => {
  const out: Record<LogLevel, number> = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
  };
  for (const b of bs) for (const l of LEVELS) out[l] += b.counts[l];
  return out;
};

export function LogHistogram({
  buckets,
  step,
  levels,
  counts,
  onToggleLevel,
  onWindow,
  withDate,
  legendSlot,
  back,
}: LogHistogramProps) {
  const { t } = useTranslation();
  const theme = useChartTheme();
  const [inst, setInst] = useState<echarts.ECharts | null>(null);
  const [brush, setBrush] = useState<{ a: number; b: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [lit, setLit] = useState<LogLevel | null>(null);
  const brushRef = useRef<{ x0: number; i0: number } | null>(null);
  const onWindowRef = useRef(onWindow);
  onWindowRef.current = onWindow;
  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;

  const marks = useMemo(() => {
    if (typeof document === 'undefined') return { danger: '', warning: '' };
    const cs = getComputedStyle(document.documentElement);
    return {
      danger: cs.getPropertyValue('--m-mark-danger').trim() || theme.danger,
      warning: cs.getPropertyValue('--m-mark-warning').trim(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const on = (l: LogLevel) => levels.length === 0 || levels.includes(l);
  const colour: Record<LogLevel, string> = {
    error: marks.danger,
    warn: marks.warning,
    info: theme.axis,
    debug: theme.grid,
  };
  const secs = step < 60_000;

  const option = useMemo(() => {
    const base = baseOption(theme);
    const labels = buckets.map((b) => clockLabel(b.from, withDate, secs));
    return {
      ...base,
      animationDuration: 0,
      animationDurationUpdate: theme.duration,
      grid: { left: 44, right: 0, top: 6, bottom: 22, containLabel: false },
      tooltip: { show: false },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: true,
        axisTick: { show: false },
        axisLine: { show: true, lineStyle: { color: theme.grid } },
        axisLabel: {
          color: theme.textMuted,
          fontFamily: theme.font,
          fontSize: theme.fontSize - 1,
          margin: 8,
          hideOverlap: true,
        },
        axisPointer: {
          show: true,
          type: 'shadow',
          snap: true,
          triggerOn: 'mousemove',
          label: { show: false },
          shadowStyle: { color: theme.text, opacity: 0.06 },
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: 2,
        minInterval: 1,
        axisLabel: {
          color: theme.textMuted,
          fontFamily: theme.font,
          fontSize: theme.fontSize - 1,
          formatter: (v: number) => compactCount(v),
        },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: ORDER.map((l) => ({
        name: l,
        type: 'bar',
        stack: 'lines',
        barCategoryGap: '28%',
        itemStyle: {
          color: colour[l],
          opacity: on(l) ? 1 : 0.18,
          borderRadius: 1,
        },
        emphasis: { focus: 'series', itemStyle: { opacity: on(l) ? 1 : 0.18 } },
        blur: { itemStyle: { opacity: on(l) ? 0.22 : 0.08 } },
        silent: true,
        data: buckets.map((b) => b.counts[l]),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, theme, levels, withDate, marks, secs]);

  useEffect(() => {
    if (!inst) return undefined;
    if (lit) inst.dispatchAction({ type: 'highlight', seriesName: lit });
    else inst.dispatchAction({ type: 'downplay' });
    return () => {
      if (lit) inst.dispatchAction({ type: 'downplay' });
    };
  }, [inst, lit, option]);

  useEffect(() => {
    const c = inst;
    if (!c) return undefined;
    const zr = c.getZr();
    const indexAt = (x: number): number | null => {
      const n = bucketsRef.current.length;
      if (n === 0) return null;
      const x0 = c.convertToPixel(
        { xAxisIndex: 0 },
        0 as never,
      ) as unknown as number;
      const x1 = c.convertToPixel(
        { xAxisIndex: 0 },
        (n - 1) as never,
      ) as unknown as number;
      const w = n > 1 ? (x1 - x0) / (n - 1) : 40;
      const i = Math.round((x - x0) / w);
      return Math.max(0, Math.min(n - 1, i));
    };
    const down = (e: { offsetX: number; offsetY: number }) => {
      if (!c.containPixel('grid', [e.offsetX, e.offsetY])) return;
      const i = indexAt(e.offsetX);
      if (i == null) return;
      brushRef.current = { x0: e.offsetX, i0: i };
      setBrush(null);
    };
    const move = (e: { offsetX: number; offsetY: number }) => {
      const inside = c.containPixel('grid', [e.offsetX, e.offsetY]);
      const i = inside ? indexAt(e.offsetX) : null;
      setHover(i);
      const s = brushRef.current;
      if (!s || i == null) return;
      if (Math.abs(e.offsetX - s.x0) < 4 && i === s.i0) return;
      setBrush({ a: Math.min(s.i0, i), b: Math.max(s.i0, i) });
    };
    const up = (e: { offsetX: number }) => {
      const s = brushRef.current;
      brushRef.current = null;
      if (!s) return;
      const i = indexAt(e.offsetX);
      const bs = bucketsRef.current;
      if (i == null || !bs.length) return setBrush(null);
      const a = bs[Math.min(s.i0, i)];
      const b = bs[Math.max(s.i0, i)];
      setBrush(null);
      if (!a || !b) return;
      if (a === b && a.to - a.from <= 1000) return;
      onWindowRef.current(a.from, b.to);
    };
    const out = () => {
      brushRef.current = null;
      setBrush(null);
      setHover(null);
    };
    zr.on('mousedown', down);
    zr.on('mousemove', move);
    zr.on('mouseup', up);
    zr.on('globalout', out);
    return () => {
      zr.off('mousedown', down);
      zr.off('mousemove', move);
      zr.off('mouseup', up);
      zr.off('globalout', out);
    };
  }, [inst]);

  const px = (i: number): number | null => {
    if (!inst || !buckets.length) return null;
    return inst.convertToPixel(
      { xAxisIndex: 0 },
      i as never,
    ) as unknown as number;
  };
  const halfBar = (): number => {
    const a = px(0);
    const b = px(1);
    return a != null && b != null ? (b - a) / 2 : 20;
  };

  const brushBox = useMemo(() => {
    if (!brush) return null;
    const l = px(brush.a);
    const r = px(brush.b);
    if (l == null || r == null) return null;
    const w = halfBar();
    return { left: l - w, width: r - l + 2 * w };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush, buckets, inst]);

  const focus = brush
    ? buckets.slice(brush.a, brush.b + 1)
    : hover != null && buckets[hover]
      ? [buckets[hover]]
      : null;
  const shown = focus ? sum(focus) : counts;
  const total = LEVELS.reduce((n, l) => n + shown[l], 0);
  const windowTotal = LEVELS.reduce((n, l) => n + counts[l], 0);
  const spanWords = (bs: readonly Bucket[]) => {
    const a = bs[0];
    const b = bs[bs.length - 1];
    if (!a || !b) return '';
    const s = b.to - a.from < 10 * 60_000 || secs;
    return `${clockLabel(a.from, withDate, s)} to ${clockLabel(b.to, withDate, s)}`;
  };
  const stampAt = hover != null && !brush ? px(hover) : null;

  const keys = LEVELS.map((l) => (
    <LevelKey
      key={l}
      level={l}
      on={on(l)}
      picked={levels.includes(l)}
      count={shown[l]}
      share={total ? shown[l] / total : 0}
      lit={lit === l}
      dim={lit != null && lit !== l}
      onHover={(h) => setLit(h ? l : null)}
      onClick={() => onToggleLevel(l)}
    />
  ));
  const mix = (extra = '') => (
    <span className={`m-logs__mix${extra}`} aria-hidden="true">
      {LEVELS.map((l) => (
        <span
          key={l}
          className={`m-logs__mix-seg m-logs__mix-seg--${l}${on(l) ? '' : ' is-off'}${lit != null && lit !== l ? ' is-dim' : ''}`}
          style={{ width: `${total ? (shown[l] / total) * 100 : 0}%` }}
        />
      ))}
    </span>
  );
  const note = (
    <span
      className={`m-logs__chart-note${focus ? ' is-reading' : ''}`}
      aria-live="polite"
    >
      {focus ? (
        <>
          <b>{spanWords(focus)}</b> · {lines(t, total)}
          {brush && (
            <span className="m-logs__chart-cue">
              {' · '}
              {t('release to narrow')}
            </span>
          )}
        </>
      ) : (
        <>
          {lines(t, windowTotal)} ·{' '}
          {t('bars of {{step}}', { step: STEP_WORDS(step) })}
          <span className="m-logs__chart-cue">
            {' · '}
            {t('drag to narrow')}
          </span>
        </>
      )}
    </span>
  );
  const legend = (
    <span className={`m-logs__keys${focus ? ' is-reading' : ''}`}>{keys}</span>
  );

  return (
    <div className="m-logs__chart">
      {legendSlot ? (
        createPortal(legend, legendSlot)
      ) : (
        <div className="m-logs__chart-head">{legend}</div>
      )}
      {mix(' m-logs__mix--top')}
      <div className="m-logs__plot">
        <EChart
          option={option}
          height={132}
          onInstance={setInst}
          ariaLabel={t('Lines over time')}
        />
        {brushBox && (
          <div
            className="m-logs__brush"
            style={{ left: brushBox.left, width: brushBox.width }}
            aria-hidden="true"
          />
        )}
        <span
          className={`m-logs__stampline${stampAt != null ? ' is-on' : ''}`}
          style={stampAt != null ? { left: stampAt } : undefined}
          aria-hidden="true"
        >
          {hover != null && buckets[hover]
            ? clockLabel(buckets[hover].from, false, secs)
            : ''}
        </span>
      </div>
      <div className="m-logs__caption">
        {back && (
          <Button
            variant="subtle"
            size="sm"
            className="m-logs__back"
            onClick={back.onBack}
          >
            <Undo2 size={13} aria-hidden="true" />
            {t('Back to {{label}}', { label: back.label })}
          </Button>
        )}
        {note}
      </div>
    </div>
  );
}

function LevelKey({
  level,
  on,
  picked,
  count,
  share,
  lit,
  dim,
  onHover,
  onClick,
}: {
  level: LogLevel;
  on: boolean;
  picked: boolean;
  count: number;
  share: number;
  lit: boolean;
  dim: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const n = useTween(count);
  const name = levelLabel(t, level);
  const pct = Math.round(share * 100);
  return (
    <button
      type="button"
      className={`m-logs__lvl${on ? '' : ' is-off'}${lit ? ' is-lit' : ''}${dim ? ' is-dim' : ''}`}
      aria-pressed={picked}
      title={`${t('{{name}}: {{n}} lines, {{pct}}%.', { name, n: count.toLocaleString(), pct, count })} ${picked ? t('Click to show every level again') : t('Click to keep only these lines')}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={onClick}
    >
      <span
        className={`m-logs__lvl-dot m-logs__lvl-dot--${level}`}
        aria-hidden="true"
      />
      <span className="m-logs__lvl-name">{name}</span>
      <b className="m-logs__lvl-n">{compactCount(n)}</b>
      <span className="m-sr-only">
        , {t('{{n}} lines, {{pct}}%', { n: count, pct })}
      </span>
    </button>
  );
}
