import { describe, expect, it } from '@jest/globals';

import {
  ALL_CHAPTERS,
  AuditDraft,
  AuditItem,
  chapterSections,
  chaptersOfSections,
  draftProblem,
  emptyDraft,
  orderChapters,
  rangeLabel,
  toCreateRequest,
  toListParams,
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
  filter: { filters: [] },
  reportType: 'analytics',
  typeInputs: {},
  periodDays: 7,
  sampleSize: 500,
  requestedSampleSize: 500,
  matchedSessions: 8140,
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

describe('chapters and sections', () => {
  it('sends every section of the picked chapters, in report order', () => {
    expect(chapterSections(['errors', 'web'], true)).toEqual([
      'web.numbers',
      'web.tops',
      'errors.numbers',
      'errors.tops',
      'errors.vitals',
    ]);
  });

  it('drops the AI chapters without Armada', () => {
    expect(orderChapters(['ux', 'web', 'journeys'], false)).toEqual(['web']);
    expect(emptyDraft(false).chapters).toEqual([
      'web',
      'usage',
      'errors',
      'retention',
    ]);
    expect(emptyDraft(true).chapters).toEqual(ALL_CHAPTERS);
  });

  it('reads chapters back from stored sections; empty = every chapter', () => {
    expect(chaptersOfSections(['adoption.retention', 'web.tops'])).toEqual([
      'web',
      'retention',
    ]);
    expect(chaptersOfSections(undefined)).toEqual(ALL_CHAPTERS);
    expect(chaptersOfSections([])).toEqual(ALL_CHAPTERS);
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
        draft({ name: '  Cart  ', filters: [filter], chapters: ['web'] }),
        true,
      ),
    ).toEqual({
      name: 'Cart',
      type: 'analytics',
      periodDays: 7,
      notify: false,
      segmentId: undefined,
      filter: { filters: [filter], eventsOrder: 'then' },
      inputs: { sections: ['web.numbers', 'web.tops'] },
    });
  });

  it('sends a segment without the full-traffic filters', () => {
    const req = toCreateRequest(
      draft({
        scope: 'segment',
        segmentId: 's9',
        filters: [{ name: 'url', operator: 'is', value: ['/'] }],
      }),
      true,
    );
    expect(req.segmentId).toBe('s9');
    expect(req.filter).toBeUndefined();
  });

  it('never sends AI sections without Armada', () => {
    const req = toCreateRequest(draft({ chapters: [...ALL_CHAPTERS] }), false);
    expect(usesAiSections(req.inputs?.sections)).toBe(false);
    expect(req.inputs?.sections).not.toContain('ux.numbers');
  });
});

describe('draftProblem', () => {
  it('names the first thing missing', () => {
    expect(draftProblem(draft({ name: ' ' }), true)).toBe('name');
    expect(draftProblem(draft({ scope: 'segment' }), true)).toBe('segment');
    expect(draftProblem(draft(), true, 2)).toBe('unfinishedFilters');
    expect(draftProblem(draft({ chapters: ['ux'] }), false)).toBe('sections');
    expect(draftProblem(draft(), true)).toBeNull();
  });
});

describe('toListParams', () => {
  it('maps tab, ordering and page to API params', () => {
    expect(
      toListParams({
        tab: 'running',
        search: ' cart ',
        startDate: 100,
        endDate: 0,
        sort: 'oldest',
        page: 3,
        pageSize: 25,
      }),
    ).toEqual({
      search: 'cart',
      startDate: 100,
      endDate: undefined,
      status: 'queued,running',
      sortField: 'created_at',
      sortOrder: 'asc',
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
  it('labels the scope and the creator', () => {
    const item = new AuditItem(
      audit({ filter: { filters: [{ operator: 'is' }, { operator: 'is' }] } }),
    );
    expect(item.scopeLabel).toBe('Full traffic, 2 filters · Last 7 days');
    expect(item.creatorLabel(12)).toBe('You');
    expect(item.creatorLabel('7')).toBe('Sarah Kim');
  });

  it('does not count a segment’s own rules as filters', () => {
    const item = new AuditItem(
      audit({
        segmentId: 's1',
        segmentName: 'Mobile visitors',
        filter: { filters: [{ operator: 'is' }] },
      }),
    );
    expect(item.scopeLabel).toBe('Mobile visitors · Last 7 days');
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
