import React from 'react';
import { numberWithCommas } from 'App/utils';

const colorsTeal = ['#1E889A', '#239DB2', '#28B2C9', '#36C0D7', '#65CFE1'];
const colors = [
  '#6774E2',
  '#929ACD',
  '#3EAAAF',
  '#565D97',
  '#8F9F9F',
  '#376F72',
];
const colorsx = [
  '#256669',
  '#38999e',
  '#3eaaaf',
  '#51b3b7',
  '#78c4c7',
  '#9fd5d7',
  '#c5e6e7',
].reverse();
const compareColors = ['#192EDB', '#6272FF', '#808DFF', '#B3BBFF', '#C9CFFF'];
const compareColorsx = [
  '#222F99',
  '#2E3ECC',
  '#394EFF',
  '#6171FF',
  '#8895FF',
  '#B0B8FF',
  '#D7DCFF',
].reverse();
const customMetricColors = ['#394EFF', '#3EAAAF', '#565D97'];
const colorsPie = colors.concat(['#DDDDDD']);
const safeColors = [
  '#394EFF',
  '#3EAAAF',
  '#9276da',
  '#ceba64',
  '#bc6f9d',
  '#966fbc',
  '#64ce86',
  '#e06da3',
  '#6dabe0',
];

const countView = (count) => {
  const isMoreThanK = count >= 1000;
  return numberWithCommas(isMoreThanK ? `${Math.trunc(count / 1000)}k` : count);
};

export default {
  customMetricColors,
  colors,
  colorsTeal,
  colorsPie,
  colorsx,
  compareColors,
  compareColorsx,
  safeColors,
  lineColor: '#2A7B7F',
  lineColorCompare: '#394EFF',
  strokeColor: compareColors[0],
  xaxis: {
    axisLine: { stroke: '#CCCCCC' },
    interval: 0,
    dataKey: 'time',
    tick: { fill: '#000000', fontSize: 9 },
    tickLine: { stroke: '#CCCCCC' },
    strokeWidth: 0.5,
  },
  yaxis: {
    axisLine: { stroke: '#CCCCCC' },
    tick: { fill: '#000000', fontSize: 9 },
    tickLine: { stroke: '#CCCCCC' },
  },
  axisLabelLeft: {
    angle: -90,
    fill: '#999999',
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
      background: 'white',
      border: '1px solid #DDD',
      borderRadius: '3px',
      lineHeight: '1.25rem',
      color: '#888',
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
      color: '#000',
      fontSize: '12px',
    },
    cursor: {
      fill: '#eee',
    },
  },
  gradientDef: () => (
    <defs>
      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={compareColors[2]} stopOpacity={0.5} />
        <stop offset="95%" stopColor={compareColors[2]} stopOpacity={0.2} />
      </linearGradient>
      <linearGradient id="colorCountCompare" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={compareColors[4]} stopOpacity={0.9} />
        <stop offset="95%" stopColor={compareColors[4]} stopOpacity={0.2} />
      </linearGradient>
    </defs>
  ),
};
