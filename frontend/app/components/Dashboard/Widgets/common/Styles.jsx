import React from 'react';

import { numberWithCommas } from 'App/utils';

/* Legacy palettes, now read from the kit's chart tokens so every chart follows the theme.
   Getters: the tokens change with light/dark, so each read takes the current values. */
const token = (name) =>
  typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const series = () =>
  Array.from({ length: 8 }, (_, i) => token(`--m-chart-${i + 1}`));

const countView = (count) => {
  const isMoreThanK = count >= 1000;
  return numberWithCommas(isMoreThanK ? `${Math.trunc(count / 1000)}k` : count);
};

export default {
  get customMetricColors() {
    return series();
  },
  get colors() {
    return series();
  },
  get colorsTeal() {
    return series();
  },
  get colorsPie() {
    return [...series(), token('--m-border-default')];
  },
  get colorsx() {
    return series();
  },
  get compareColors() {
    return series();
  },
  get compareColorsx() {
    return series();
  },
  get safeColors() {
    return series();
  },
  get lineColor() {
    return token('--m-chart-1');
  },
  get lineColorCompare() {
    return token('--m-chart-2');
  },
  get strokeColor() {
    return token('--m-chart-1');
  },
  xaxis: {
    axisLine: { stroke: 'var(--m-chart-grid)' },
    interval: 0,
    dataKey: 'time',
    tick: { fill: 'var(--m-chart-axis)', fontSize: 9 },
    tickLine: { stroke: 'var(--m-chart-grid)' },
    strokeWidth: 0.5,
  },
  yaxis: {
    axisLine: { stroke: 'var(--m-chart-grid)' },
    tick: { fill: 'var(--m-chart-axis)', fontSize: 9 },
    tickLine: { stroke: 'var(--m-chart-grid)' },
  },
  axisLabelLeft: {
    angle: -90,
    fill: 'var(--m-content-muted)',
    offset: 10,
    style: { textAnchor: 'middle' },
    position: 'insideLeft',
    fontSize: 11,
  },
  tickFormatter: (val) => `${countView(val)}`,
  tickFormatterBytes: (val) => Math.round(val / 1024 / 1024),
  chartMargins: {
    left: 0,
    right: 20,
    top: 10,
    bottom: 5,
  },
  tooltip: {
    wrapperStyle: {
      zIndex: 999,
    },
    contentStyle: {
      padding: '5px',
      background: 'var(--m-surface-raised)',
      border: '1px solid var(--m-border-default)',
      borderRadius: 'var(--m-radius-control)',
      lineHeight: '1.25rem',
      color: 'var(--m-content-secondary)',
      fontSize: '10px',
    },
    labelStyle: {},
    formatter: (value, name, { unit }) => {
      if (unit && unit.trim() === 'mb') {
        return numberWithCommas(Math.round(value / 1024 / 1024));
      }
      return numberWithCommas(Math.round(value));
    },
    itemStyle: {
      lineHeight: '0.75rem',
      color: 'var(--m-content-primary)',
      fontSize: '12px',
    },
    cursor: {
      fill: 'var(--m-surface-hover)',
    },
  },
  gradientDef: () => (
    <defs>
      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--m-chart-1)" stopOpacity={0.5} />
        <stop offset="95%" stopColor="var(--m-chart-1)" stopOpacity={0.2} />
      </linearGradient>
      <linearGradient id="colorCountCompare" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--m-chart-2)" stopOpacity={0.9} />
        <stop offset="95%" stopColor="var(--m-chart-2)" stopOpacity={0.2} />
      </linearGradient>
    </defs>
  ),
};
