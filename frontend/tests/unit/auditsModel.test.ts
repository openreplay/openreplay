import { describe, expect, it } from '@jest/globals';

import {
  ALL_CHAPTERS,
  AuditDraft,
  AuditItem,
  MAX_SEGMENTS,
  chapterOfGroup,
  chaptersOfSections,
  clampCustomRange,
  draftProblem,
  emptyDraft,
  orderChapters,
  rangeLabel,
  toCreateRequest,
  toListParams,
  usableChapters,
  usesAiSections,
} from 'App/components/Audits/model';
import { Audit } from 'App/components/Audits/types';

const draft = (patch: Partial<AuditDraft> = {}): AuditDraft => ({
  ...emptyDraft(true),
  name: 'Checkout',
  ...patch,
});

const audit = (patch: Partial<Audit> = {}): Audit => ({
  auditId: 'a1',
  projectId: 65,
  userId: 12,
  userName: 'Sarah Kim',
  name: 'Checkout',
  segmentId: '',
  segmentName: '',
  segments: [],
  filter: { filters: [] },
  reportType: 'analytics',
  typeInputs: {},
  periodDays: 7,
  periodStart: '2026-11-13T00:00:00Z',
  periodEnd: '2026-11-20T00:00:00Z',
  periodCustom: false,
  chapters: ['web', 'ux'],
  ai: false,
  sampleSize: 500,
  requestedSampleSize: 500,
  matchedSessions: 8140,
  matchedUsers: 3100,
  samplePct: 6.1,
  processedSessions: 0,
  progress: 0,
  status: 'queued',
  health: null,
  notify: false,
  artifacts: { pdf: false, slides: false, html: false },
  createdAt: '2026-11-20T16:48:00Z',
  canEdit: true,
  ...patch,
});

describe('chapters', () => {
  it('locks only Issues and journeys without AI access', () => {
    expect(usableChapters(false)).toEqual([
      'web',
      'usage',
      'errors',
      'retention',
      'ux',
    ]);
    expect(usableChapters(true)).toEqual(ALL_CHAPTERS);
    expect(orderChapters(['journeys', 'ux', 'web'], false)).toEqual([
      'web',
      'ux',
    ]);
    expect(orderChapters(['journeys', 'web'], true)).toEqual([
      'web',
      'journeys',
    ]);
  });

  it('maps section groups, old and new names, to chapters', () => {
    expect(chapterOfGroup('usage')?.key).toBe('usage');
    expect(chapterOfGroup('product')?.key).toBe('usage');
    expect(chapterOfGroup('adoption')?.key).toBe('retention');
  });

  it('reads chapters back from stored sections on older audits', () => {
    expect(chaptersOfSections(['adoption.retention', 'web.tops'])).toEqual([
      'web',
      'retention',
    ]);
    expect(chaptersOfSections(undefined)).toEqual(ALL_CHAPTERS);
  });

  it('knows which sections are written by a model', () => {
    expect(usesAiSections(['ux.numbers', 'journeys.issues'])).toBe(false);
    expect(usesAiSections(['ux.quickwins'])).toBe(true);
  });
});

describe('toCreateRequest', () => {
  it('builds an analytics audit over full traffic with filters', () => {
    const filter = { name: 'url', operator: 'contains', value: ['/cart'] };
    expect(
      toCreateRequest(
        draft({
          name: '  Cart  ',
          filters: [filter],
          chapters: ['errors', 'web'],
        }),
        true,
      ),
    ).toEqual({
      name: 'Cart',
      type: 'analytics',
      periodDays: 7,
      notify: false,
      segmentIds: undefined,
      filter: { filters: [filter], eventsOrder: 'then' },
      sections: ['web', 'errors'],
    });
  });

  it('sends segments without the full-traffic filters', () => {
    const req = toCreateRequest(
      draft({
        scope: 'segments',
        segmentIds: ['s1', 's2'],
        filters: [{ name: 'url', operator: 'is', value: ['/'] }],
      }),
      true,
    );
    expect(req.segmentIds).toEqual(['s1', 's2']);
    expect(req.filter).toBeUndefined();
  });

  it('sends at most three segments', () => {
    const req = toCreateRequest(
      draft({ scope: 'segments', segmentIds: ['s1', 's2', 's3', 's4'] }),
      true,
    );
    expect(MAX_SEGMENTS).toBe(3);
    expect(req.segmentIds).toEqual(['s1', 's2', 's3']);
  });

  it('never sends Issues and journeys without AI access', () => {
    const req = toCreateRequest(draft({ chapters: [...ALL_CHAPTERS] }), false);
    expect(req.sections).toEqual(['web', 'usage', 'errors', 'retention', 'ux']);
  });
});

describe('custom range', () => {
  it('ends today at the latest and keeps the last 30 days', () => {
    expect(
      clampCustomRange({ from: '2026-11-01', to: '2026-11-14' }, '2026-11-25'),
    ).toEqual({
      from: '2026-11-01',
      to: '2026-11-14',
      days: 14,
      clamped: false,
    });
    expect(
      clampCustomRange({ from: '2026-10-01', to: '2026-11-30' }, '2026-11-25'),
    ).toEqual({
      from: '2026-10-27',
      to: '2026-11-25',
      days: 30,
      clamped: true,
    });
  });

  it('is sent beside the preset, which the API then ignores', () => {
    const req = toCreateRequest(
      draft({ custom: { from: '2026-11-01', to: '2026-11-14' } }),
      true,
    );
    expect(req.custom).toEqual({ from: '2026-11-01', to: '2026-11-14' });
    expect(req.periodDays).toBe(7);
  });
});

describe('draftProblem', () => {
  it('names the first thing missing', () => {
    expect(draftProblem(draft({ name: ' ' }), true)).toBe('name');
    expect(draftProblem(draft({ scope: 'segments' }), true)).toBe('segment');
    expect(draftProblem(draft(), true, 2)).toBe('unfinishedFilters');
    expect(draftProblem(draft({ chapters: ['journeys'] }), false)).toBe(
      'sections',
    );
    expect(draftProblem(draft(), true)).toBeNull();
  });
});

describe('toListParams', () => {
  it('maps tab, ordering, page and filters to API params', () => {
    expect(
      toListParams({
        tab: 'running',
        search: ' cart ',
        startDate: 100,
        endDate: 0,
        sort: 'sessions',
        page: 3,
        pageSize: 25,
        filters: {
          segment: 'full',
          periodDays: 30,
          userId: 7,
          chapters: ['ux', 'web'],
        },
      }),
    ).toEqual({
      search: 'cart',
      startDate: 100,
      endDate: undefined,
      status: 'queued,running',
      segmentId: 'full',
      periodDays: 30,
      userId: 7,
      chapters: 'web,ux',
      sortField: 'sessions',
      sortOrder: 'desc',
      limit: 25,
      offset: 50,
    });
  });
});

describe('dates', () => {
  it('formats ranges within a month, across months and years', () => {
    expect(rangeLabel(Date.UTC(2026, 10, 13), Date.UTC(2026, 10, 19))).toBe(
      '13–19 Nov 2026',
    );
    expect(rangeLabel(Date.UTC(2026, 9, 28), Date.UTC(2026, 10, 3))).toBe(
      '28 Oct – 3 Nov 2026',
    );
    expect(rangeLabel(Date.UTC(2025, 11, 30), Date.UTC(2026, 0, 5))).toBe(
      '30 Dec 2025 – 5 Jan 2026',
    );
  });
});

describe('AuditItem', () => {
  it('labels the scope with the stored window and the creator', () => {
    const item = new AuditItem(
      audit({ filter: { filters: [{ operator: 'is' }, { operator: 'is' }] } }),
    );
    expect(item.scopeLabel).toBe('Full traffic, 2 filters · 13–19 Nov 2026');
    expect(item.creatorLabel(12)).toBe('You');
    expect(item.creatorLabel('7')).toBe('Sarah Kim');
    expect(item.users).toBe(3100);
    expect(item.chapters).toEqual(['web', 'ux']);
  });

  it('shows a rolling 24 hours as the two days it spans', () => {
    const item = new AuditItem(
      audit({
        periodDays: 1,
        periodStart: '2026-11-24T16:48:00Z',
        periodEnd: '2026-11-25T16:48:00Z',
      }),
    );
    expect(item.periodLabel).toBe('24–25 Nov 2026');
  });

  it('falls back to the period length on audits without a stored window', () => {
    const item = new AuditItem(
      audit({ periodStart: null, periodEnd: null, periodDays: 30 }),
    );
    expect(item.periodLabel).toBe('Last 30 days');
  });

  it('names the compared segments, without counting their rules as filters', () => {
    const item = new AuditItem(
      audit({
        segments: [
          { id: 's1', name: 'Mobile visitors' },
          { id: 's2', name: 'New sign-ups' },
        ],
        filter: { filters: [{ operator: 'is' }] },
      }),
    );
    expect(item.scopeLabel).toBe(
      'Mobile visitors, New sign-ups · 13–19 Nov 2026',
    );
  });

  it('tracks status', () => {
    const queued = new AuditItem(audit());
    expect(queued.isActive).toBe(true);
    expect(queued.canRerun).toBe(false);
    const ready = new AuditItem(audit({ status: 'ready', progress: 99 }));
    expect(ready.progress).toBe(100);
    expect(ready.canRerun).toBe(true);
  });
});
