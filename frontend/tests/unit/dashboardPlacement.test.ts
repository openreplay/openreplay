import { describe, expect, it } from '@jest/globals';

import { loneHalves } from 'App/components/Dashboard/components/DashboardWidgetGrid/placement';

const half = (name: string) => ({
  name,
  metricType: 'timeseries',
  config: { col: 2 },
});
const full = (name: string) => ({
  name,
  metricType: 'table',
  config: { col: 4 },
});
const heatmap = (col = 2) => ({
  name: 'heatmap',
  metricType: 'heatMap',
  config: { col },
});

const lone = (widgets: { name: string }[]) =>
  [...loneHalves(widgets)].map((w) => w.name);

describe('dashboard placement', () => {
  it('stretches a half nothing sits beside', () => {
    expect(lone([half('a'), full('b'), half('c'), half('d')])).toEqual(['d']);
  });

  it('keeps a heatmap one column wide, even alone', () => {
    expect(lone([heatmap()])).toEqual([]);
    expect(lone([full('a'), heatmap(), full('b')])).toEqual([]);
  });

  it('stacks two halves beside a heatmap', () => {
    expect(lone([heatmap(), half('a'), half('b')])).toEqual([]);
    expect(lone([half('a'), heatmap(), half('b')])).toEqual([]);
    expect(lone([heatmap(), half('a'), half('b'), half('c')])).toEqual(['c']);
  });

  it('puts a full widget under a heatmap, not beside its lower half', () => {
    expect(lone([heatmap(), half('a'), full('b'), half('c')])).toEqual([]);
    expect(lone([heatmap(), full('b'), half('c')])).toEqual([]);
  });

  it('places a full-width heatmap as two full rows', () => {
    expect(lone([heatmap(4), half('a')])).toEqual(['a']);
  });
});
