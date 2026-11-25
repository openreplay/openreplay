import Period, { CUSTOM_RANGE, LAST_30_DAYS } from 'Types/app/period';
import { makeAutoObservable, observableRef } from 'mobx';

import {
  AuditFieldKey,
  AuditFilters,
  AuditSortKey,
  AuditTab,
  type ChapterKey,
  DEFAULT_FIELDS,
  ListQuery,
  NO_FILTERS,
  filterCount,
  toCountsParams,
  toListParams,
} from './model';
import { CountsParams, ListAuditsParams } from './types';

export type AuditFilterKey = 'segment' | 'period' | 'creator' | 'chapters';

const DISPLAY_KEY = '__or_audits_display';

interface Display {
  sort: AuditSortKey;
  fields: AuditFieldKey[];
}

const DEFAULT_DISPLAY: Display = {
  sort: 'recent',
  fields: [...DEFAULT_FIELDS],
};

function readDisplay(): Display {
  try {
    const raw = JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? 'null');
    if (!raw) return { ...DEFAULT_DISPLAY };
    return {
      sort: raw.sort ?? DEFAULT_DISPLAY.sort,
      fields: Array.isArray(raw.fields) ? raw.fields : DEFAULT_DISPLAY.fields,
    };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

const defaultPeriod = () => Period({ rangeName: LAST_30_DAYS });

/** The audits list's own state: what the page asks the API for, and how rows are drawn. */
export class AuditsUiStore {
  tab: AuditTab = 'all';

  /** Settled search text (the field debounces before setting it). */
  search = '';

  period: ReturnType<typeof Period> = defaultPeriod();

  sort: AuditSortKey = DEFAULT_DISPLAY.sort;

  fields: AuditFieldKey[] = [...DEFAULT_DISPLAY.fields];

  page = 1;

  filters: AuditFilters = { ...NO_FILTERS };

  private projectId = '';

  constructor() {
    const display = readDisplay();
    this.sort = display.sort;
    this.fields = display.fields;
    makeAutoObservable(this, { period: observableRef });
  }

  /** Segments belong to a project, and the page may be past the new project's end. */
  forProject = (projectId: string) => {
    if (this.projectId && this.projectId !== projectId) {
      this.filters = { ...this.filters, segment: undefined };
      this.page = 1;
    }
    this.projectId = projectId;
  };

  setTab = (tab: AuditTab) => {
    this.tab = tab;
    this.page = 1;
  };

  setSearch = (search: string) => {
    this.search = search;
    this.page = 1;
  };

  setPeriod = (period: ReturnType<typeof Period>) => {
    this.period = period;
    this.page = 1;
  };

  /** Scope, period and creator take one value (picking it again clears it); chapters add up. */
  toggleFilter = (key: AuditFilterKey, value: string) => {
    const f = this.filters;
    if (key === 'segment')
      this.filters = { ...f, segment: f.segment === value ? undefined : value };
    else if (key === 'period')
      this.filters = {
        ...f,
        periodDays: f.periodDays === Number(value) ? undefined : Number(value),
      };
    else if (key === 'creator')
      this.filters = {
        ...f,
        userId: f.userId === Number(value) ? undefined : Number(value),
      };
    else {
      const k = value as ChapterKey;
      this.filters = {
        ...f,
        chapters: f.chapters.includes(k)
          ? f.chapters.filter((c) => c !== k)
          : [...f.chapters, k],
      };
    }
    this.page = 1;
  };

  isFilterActive = (key: AuditFilterKey, value: string): boolean => {
    const f = this.filters;
    if (key === 'segment') return f.segment === value;
    if (key === 'period') return f.periodDays === Number(value);
    if (key === 'creator') return f.userId === Number(value);
    return f.chapters.includes(value as ChapterKey);
  };

  clearFilters = () => {
    this.filters = { ...NO_FILTERS };
    this.page = 1;
  };

  get filterCount(): number {
    return filterCount(this.filters);
  }

  setPage = (page: number) => {
    this.page = page;
  };

  setSort = (sort: AuditSortKey) => {
    this.sort = sort;
    this.page = 1;
    this.saveDisplay();
  };

  toggleField = (field: AuditFieldKey) => {
    this.fields = this.fields.includes(field)
      ? this.fields.filter((f) => f !== field)
      : [...this.fields, field];
    this.saveDisplay();
  };

  hasField = (field: AuditFieldKey) => this.fields.includes(field);

  get displayChanges(): number {
    const sortChanged = this.sort === DEFAULT_DISPLAY.sort ? 0 : 1;
    const fieldChanges = (['sessions', 'status', 'created'] as const).filter(
      (f) => this.fields.includes(f) !== DEFAULT_DISPLAY.fields.includes(f),
    ).length;
    return sortChanged + fieldChanges;
  }

  resetDisplay = () => {
    this.sort = DEFAULT_DISPLAY.sort;
    this.fields = [...DEFAULT_DISPLAY.fields];
    this.saveDisplay();
  };

  /** Clears what narrows the list (not the display), e.g. after creating an audit. */
  showAll = () => {
    this.tab = 'all';
    this.search = '';
    this.period = defaultPeriod();
    this.filters = { ...NO_FILTERS };
    this.page = 1;
  };

  // A preset's end is "now" at the moment it was picked: sending it would hide audits
  // created since, so only a custom range bounds the end.
  get window(): { startDate: number; endDate: number } {
    const custom = this.period.rangeName === CUSTOM_RANGE;
    return {
      startDate: this.period.start || 0,
      endDate: custom ? this.period.end || 0 : 0,
    };
  }

  listQuery(pageSize: number): ListQuery {
    return {
      tab: this.tab,
      search: this.search,
      ...this.window,
      sort: this.sort,
      page: this.page,
      pageSize,
      filters: this.filters,
    };
  }

  listParams(pageSize: number): ListAuditsParams {
    return toListParams(this.listQuery(pageSize));
  }

  get countsParams(): CountsParams {
    return toCountsParams({ search: this.search, ...this.window });
  }

  private saveDisplay() {
    try {
      localStorage.setItem(
        DISPLAY_KEY,
        JSON.stringify({ sort: this.sort, fields: this.fields }),
      );
    } catch {}
  }
}

export const auditsUi = new AuditsUiStore();
