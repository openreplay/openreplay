import { describe, expect, it } from '@jest/globals';

import {
  isTallWidget,
  loneHalves,
} from 'App/components/Dashboard/components/DashboardWidgetGrid/placement';

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
const page = (w: number, h: number) =>
  `data:application/vnd.openreplay.page+gzip;w=${w};h=${h};base64,H4sI`;
const heatmap = (col = 2, thumbnail = page(1440, 3000)) => ({
  name: 'heatmap',
  metricType: 'heatMap',
  thumbnail,
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

  it('gives a page about as tall as wide one row', () => {
    expect(isTallWidget(heatmap(2, page(1440, 3000)))).toBe(true);
    expect(isTallWidget(heatmap(2, page(390, 2400)))).toBe(true);
    expect(isTallWidget(heatmap(2, page(1440, 900)))).toBe(false);
    // a picture thumbnail carries no size
    expect(isTallWidget(heatmap(2, 'data:image/png;base64,iVBO'))).toBe(false);
    const short = heatmap(2, page(1440, 900));
    expect(lone([short, half('a'), half('b')])).toEqual(['b']);
    expect(lone([short])).toEqual([]);
  });

  it('places a full-width heatmap as two full rows', () => {
    expect(lone([heatmap(4), half('a')])).toEqual(['a']);
  });
});
