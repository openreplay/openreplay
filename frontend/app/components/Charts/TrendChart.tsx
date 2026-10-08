import { EChart, baseOption, useChartTheme } from '@/ui/data/chart';
import type { EChartsCoreOption } from 'echarts/core';
import React from 'react';

export type TrendView =
  | 'lineChart'
  | 'areaChart'
  | 'barChart'
  | 'progressChart'
  | 'pieChart';

interface ChartData {
  chart?: Record<string, any>[];
  namesMap?: (string | null)[];
}

interface Props {
  data: ChartData;
  compData?: ChartData;
  viewType: TrendView;
  label?: string;
  height?: number;
  /** Compact grid-cell rendering: no axis name, fewer ticks. */
  inGrid?: boolean;
  onClick?: (event: {
    activePayload: [{ payload: { timestamp: number } }];
    seriesName: string;
  }) => void;
  onSeriesFocus?: (seriesName: string) => void;
}

const fmtNum = (n: number) =>
  n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();

const PREV = /^Previous\s+/;

/** Timeseries card in every view type, drawn on the kit chart theme. */
export default function TrendChart({
  data,
  compData,
  viewType,
  label,
  height = 240,
  inGrid,
  onClick,
  onSeriesFocus,
}: Props) {
  const t = useChartTheme();
  const points = data.chart ?? [];
  const names = (data.namesMap ?? []).filter((n): n is string => !!n);
  const compPoints = compData?.chart ?? [];
  const compNames = (compData?.namesMap ?? []).filter((n): n is string => !!n);
  // callers rebuild `data` / `compData` on every render (filtered copies of the
  // store's object): key the option on content so it isn't rebuilt each time
  const namesKey = names.join('\u0000');
  const compNamesKey = compNames.join('\u0000');

  const option = React.useMemo<EChartsCoreOption | null>(() => {
    if (!t.series.length || !names.length) return null;
    const base = baseOption(t);
    const colorOf = (name: string) =>
      t.series[
        Math.max(0, names.indexOf(name.replace(PREV, ''))) % t.series.length
      ];
    const lines = [
      ...names.map((name) => ({
        name,
        compare: false,
        values: points.map((p) => Number(p[name] ?? 0)),
      })),
      ...compNames.map((name) => ({
        name,
        compare: true,
        values: compPoints.map((p) => Number(p[name] ?? 0)),
      })),
    ];
    const legend =
      names.length > 1
        ? {
            ...(base.legend as object),
            show: true,
            right: 0,
            left: label && !inGrid ? 132 : 8,
            data: names,
          }
        : { ...(base.legend as object), show: false };
    const x = points.map((p) => p.time ?? '');
    const interval = Math.max(0, Math.ceil(x.length / 8) - 1);
    const axisX = {
      type: 'category',
      data: x,
      boundaryGap: viewType === 'barChart',
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
      axisLabel: { color: t.axis, interval, hideOverlap: true, margin: 10 },
    };
    const axisY = {
      type: 'value',
      minInterval: 1,
      name: inGrid ? undefined : label,
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: { color: t.axis, align: 'left', padding: [0, 0, 0, -4] },
      splitLine: { lineStyle: { color: t.grid } },
      axisLabel: { color: t.axis, formatter: (v: number) => fmtNum(v) },
    };
    const tooltipAxis = {
      ...(base.tooltip as object),
      trigger: 'axis',
      axisPointer: {
        type: viewType === 'barChart' ? 'shadow' : 'line',
        lineStyle: { color: t.border },
        shadowStyle: { color: 'rgba(127,127,127,0.06)' },
      },
      valueFormatter: (v: number) => fmtNum(v),
    };
    const grid = {
      left: 8,
      right: 16,
      top: names.length > 1 || (label && !inGrid) ? 40 : 16,
      bottom: 4,
      containLabel: true,
    };

    if (viewType === 'lineChart' || viewType === 'areaChart') {
      return {
        ...base,
        legend,
        grid,
        tooltip: tooltipAxis,
        xAxis: axisX,
        yAxis: axisY,
        series: lines.map((s) => ({
          type: 'line',
          name: s.name,
          data: s.values,
          showSymbol: s.values.length === 1,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 2,
            type: s.compare ? 'dashed' : 'solid',
            color: colorOf(s.name),
            cap: 'round',
            join: 'round',
          },
          itemStyle: {
            color: colorOf(s.name),
            borderColor: t.surface,
            borderWidth: 2,
          },
          areaStyle:
            viewType === 'areaChart' && !s.compare
              ? { color: colorOf(s.name), opacity: 0.12 }
              : names.length === 1 && !s.compare
                ? {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: colorOf(s.name) },
                        { offset: 1, color: t.surface },
                      ],
                    },
                    opacity: 0.16,
                  }
                : undefined,
          stack: viewType === 'areaChart' && !s.compare ? 'total' : undefined,
          emphasis: { focus: 'series', lineStyle: { width: 2 } },
          blur: { lineStyle: { opacity: 0.25 } },
        })),
      };
    }
    if (viewType === 'barChart') {
      return {
        ...base,
        legend,
        grid,
        tooltip: tooltipAxis,
        xAxis: axisX,
        yAxis: axisY,
        series: lines.map((s) => ({
          type: 'bar',
          name: s.name,
          data: s.values,
          barMaxWidth: 24,
          barGap: '10%',
          itemStyle: {
            color: colorOf(s.name),
            borderRadius: [4, 4, 0, 0],
            decal: s.compare
              ? {
                  symbol: 'rect',
                  dashArrayX: [1, 0],
                  dashArrayY: [2, 3],
                  rotation: Math.PI / 4,
                  color: 'rgba(255,255,255,0.35)',
                }
              : undefined,
          },
          emphasis: { focus: 'series' },
        })),
      };
    }
    const totals = lines
      .filter((s) => !s.compare)
      .map((s) => ({
        name: s.name,
        value: s.values.reduce((a, b) => a + b, 0),
      }));
    if (viewType === 'progressChart') {
      return {
        ...base,
        grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
        tooltip: {
          ...(base.tooltip as object),
          trigger: 'item',
          valueFormatter: (v: number) => fmtNum(v),
        },
        xAxis: {
          type: 'value',
          name: inGrid ? undefined : label,
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: { color: t.axis },
          splitLine: { lineStyle: { color: t.grid } },
          axisLabel: { color: t.axis, formatter: (v: number) => fmtNum(v) },
        },
        yAxis: {
          type: 'category',
          data: totals.map((s) => s.name),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: t.textSecondary },
        },
        series: [
          {
            type: 'bar',
            data: totals.map((s, i) => ({
              value: s.value,
              itemStyle: {
                color: t.series[i % t.series.length],
                borderRadius: [0, 4, 4, 0],
              },
            })),
            barMaxWidth: 24,
            label: {
              show: true,
              position: 'right',
              color: t.textSecondary,
              formatter: (p: { value: number }) => fmtNum(p.value),
            },
          },
        ],
      };
    }
    return {
      ...base,
      legend: {
        ...(base.legend as object),
        show: totals.length > 1,
        data: totals.map((s) => s.name),
      },
      tooltip: {
        ...(base.tooltip as object),
        trigger: 'item',
        formatter: (p: {
          name: string;
          value: number;
          percent: number;
          marker: string;
        }) => `${p.marker} ${p.name}<br/>${fmtNum(p.value)} (${p.percent}%)`,
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: t.surface,
            borderWidth: 2,
            borderRadius: 3,
          },
          emphasis: { scaleSize: 4 },
          data: totals.map((s, i) => ({
            name: s.name,
            value: s.value,
            itemStyle: { color: t.series[i % t.series.length] },
          })),
        },
      ],
    };
  }, [points, compPoints, namesKey, compNamesKey, viewType, t, label, inGrid]);

  if (!option) return null;
  return (
    <EChart
      option={option}
      height={height}
      ariaLabel={label}
      onClick={(p) => {
        if (p.componentType !== 'series') return;
        const series = p.seriesName ?? p.name ?? '';
        if (viewType === 'progressChart' || viewType === 'pieChart') {
          onSeriesFocus?.(p.name ?? series);
          return;
        }
        if (typeof p.dataIndex !== 'number') return;
        onClick?.({
          activePayload: [
            { payload: { timestamp: points[p.dataIndex]?.timestamp } },
          ],
          seriesName: series,
        });
        if (series) onSeriesFocus?.(series.replace(PREV, ''));
      }}
    />
  );
}
