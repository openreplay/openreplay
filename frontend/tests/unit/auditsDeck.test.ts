import { describe, expect, it } from '@jest/globals';

import {
  type Slide,
  buildDeck,
  chapterName,
  emphasise,
} from 'App/components/Audits/report/slides';
import type { Report } from 'App/components/Audits/types';

import fixture from './fixtures/auditReportV4.json';

const report = fixture as unknown as Report;
const { meta, slides } = buildDeck(report);
const byShort = (short: string) => slides.find((s) => s.short === short);
const of = <K extends Slide['kind']>(s: Slide | undefined, kind: K) => {
  expect(s?.kind).toBe(kind);
  return s as Extract<Slide, { kind: K }>;
};

describe('buildDeck (schema version 4)', () => {
  it('opens with the cover, contents and the executive summary', () => {
    expect(slides.slice(0, 4).map((s) => s.short)).toEqual([
      'Cover',
      'Contents',
      'Executive summary: insight',
      'Executive summary',
    ]);
    expect(meta).toMatchObject({
      title: 'Full traffic',
      month: 'November 2026',
      period: '13–19 Nov 2026',
      organization: 'Northfield Labs',
      generated: '20 Nov 2026, 16:48 UTC',
      sessions: 1932,
      users: 412,
    });
  });

  it('orders chapters as the New audit dropdown does, numbered per report', () => {
    const chapters = [...new Set(slides.map((s) => s.section))];
    expect(chapters).toEqual([
      'intro',
      'web',
      'usage',
      'errors',
      'retention',
      'ux',
      'journeys',
      'notes',
    ]);
    expect(chapterName('retention', slides)).toEqual({
      n: '04',
      name: 'Features and retention',
    });
  });

  it('turns metrics into KPI tiles with the change against the previous period', () => {
    const traffic = of(byShort('Traffic'), 'kpis');
    expect(traffic.kpis[0]).toMatchObject({
      value: '1,932',
      delta: { text: '▲ 16.6%', tone: 'good', vs: '1,657' },
    });
    expect(traffic.kpis[3]).toMatchObject({ value: '27:39', unit: 'min' });
    expect(traffic.kpis[5].split).toEqual([
      { label: 'Desktop', value: 12646 },
      { label: 'Mobile', value: 60 },
    ]);
    const rates = of(byShort('Error rates'), 'kpis');
    expect(rates.kpis[0]).toMatchObject({
      value: '49.2%',
      delta: { text: '▼ 0.6 pts', tone: 'good' },
      note: '950 sessions',
    });
  });

  it('pages lists by five and says when a list is empty', () => {
    expect(of(byShort('Users 1–5'), 'list').rows).toHaveLength(5);
    expect(of(byShort('Users 6'), 'list').start).toBe(5);
    expect(of(byShort('Devices'), 'message').text).toBe(
      'Nothing in this period.',
    );
    const countries = of(byShort('Countries'), 'list');
    expect(countries.rows[0].mark).toEqual({ kind: 'flag', cc: 'US' });
    const clicks = of(byShort('Clicks'), 'list');
    expect(clicks.rows[1]).toMatchObject({
      unlabelled: true,
      code: 'div.m-nav > button:nth-child(2)',
    });
    const failed = of(byShort('Failed requests'), 'list');
    expect(failed.rows[0].tag).toEqual({ text: '400', tone: 'bad' });
  });

  it('draws feature use and journeys by group as index tables', () => {
    const f = of(byShort('Features 1–5'), 'matrix');
    expect(f.columns.map((c) => c.label)).toEqual([
      'All traffic',
      'Power Users',
      '401 Errors',
    ]);
    expect(f.rows[0].values).toEqual([93.2, 95.3, 98.1]);
    expect(byShort('Features 6')?.kind).toBe('matrix');
    const seg = of(byShort('Journeys by segment'), 'matrix');
    expect(seg.columns.map((c) => c.label)).toEqual([
      'All sessions',
      'Power Users',
    ]);
    const plan = of(byShort('Journeys by plan'), 'matrix');
    expect(plan.columns.map((c) => c.label)).toEqual([
      'All sessions',
      'free',
      'enterprise',
    ]);
    expect(plan.columns[2].few).toBe(true);
    expect(plan.rows[0].values).toEqual([33, 42, 27]);
  });

  it('splits Web Vitals by device, rating each average', () => {
    const desktop = of(byShort('Web Vitals: desktop'), 'vitals');
    expect(desktop.vitals.map((v) => v.key)).toEqual(['TTFB', 'LCP', 'CLS']);
    expect(desktop.vitals[0].device).toMatchObject({
      avg: '698 ms',
      rating: 2,
    });
    expect(desktop.vitals[1].device).toMatchObject({
      avg: '2.05 s',
      rating: 0,
    });
    const mobile = of(byShort('Web Vitals: mobile'), 'vitals');
    expect(mobile.vitals[0].device).toBeNull();
  });

  it('puts each insight before the slide it speaks about', () => {
    const i = slides.findIndex((s) => s.short === 'Frustrations: insight');
    expect(slides[i + 1].short).toBe('Frustrations');
    const wins = of(byShort('Quick wins'), 'list');
    expect(wins.rows.map((r) => r.effort)).toEqual([1, 2, 3]);
    expect(wins.facts).toEqual([]);
    expect(wins.unverified).toEqual(['37%']);
    const frustrations = of(byShort('Frustrations'), 'list');
    expect(frustrations.rows.map((r) => r.critical)).toEqual([
      true,
      false,
      false,
    ]);
    expect(frustrations.rows.map((r) => r.journeys)).toEqual([[], [], []]);
    expect(
      frustrations.rows.map(
        (r) => r.lines?.[0]?.kind === 'impact' && r.lines[0].text,
      ),
    ).toEqual([
      'seen in 12% of the sessions read · Errors',
      'seen in 26% of the sessions read · Errors',
      'seen in under 1% of the sessions read',
    ]);
    expect(frustrations.foot).toMatch(/The warning mark: flagged critical\.$/);
  });

  it('keeps a section that failed or found nothing as a message slide', () => {
    expect(of(byShort('Common actions'), 'message')).toMatchObject({
      failed: true,
      text: 'The model did not answer in time.',
    });
    expect(of(byShort('Impactful issues'), 'message').text).toBe(
      'No issue was seen in the sessions read.',
    );
  });

  it('ends with notes that name recording gaps', () => {
    const notes = of(slides[slides.length - 1], 'notes');
    expect(notes.notes.map(([t]) => t)).toContain('Days with no sessions');
    expect(
      notes.notes.find(([t]) => t === 'Days with no sessions')?.[1],
    ).toMatch(/^8 Nov in the comparison period/);
  });
});

describe('buildDeck before version 4', () => {
  it('shows the summary of the stub report', () => {
    const deck = buildDeck(
      {
        schemaVersion: 1,
        health: 80,
        meta: {
          title: 'Checkout',
          subtitle: '',
          periodLabel: 'Last 30 days',
          sampleSize: 500,
          matchedSessions: null,
          generatedAt: '2026-11-20T16:48:00Z',
        },
        summary: {
          headline: 'Checkout works',
          body: 'Mostly.',
          findings: [{ severity: 'major', title: 'Slow payment' }],
        },
        scorecard: [],
        journey: { steps: [], note: '', callout: '' },
        artifacts: { pdf: false, slides: false, html: false },
      },
      'Checkout',
    );
    expect(deck.slides.map((s) => s.kind)).toEqual([
      'cover',
      'message',
      'list',
    ]);
    expect(deck.meta.period).toBe('Last 30 days');
  });
});

describe('emphasise', () => {
  it('marks the writer’s phrases, else the first numbers', () => {
    expect(
      emphasise('Free users browse; paid users filter.', ['browse', 'filter'])
        .filter((p) => p.em)
        .map((p) => p.text),
    ).toEqual(['browse', 'filter']);
    expect(
      emphasise('Sessions grew 16.6%, half hit 400.', [])
        .filter((p) => p.em)
        .map((p) => p.text),
    ).toEqual(['16.6%', '400']);
  });
});
