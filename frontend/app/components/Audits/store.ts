import Period, { CUSTOM_RANGE, LAST_30_DAYS } from 'Types/app/period';
import { makeAutoObservable, observableRef } from 'mobx';

import {
  AuditFieldKey,
  AuditSortKey,
  AuditTab,
  DEFAULT_FIELDS,
  ListQuery,
  toCountsParams,
  toListParams,
} from './model';
import { CountsParams, ListAuditsParams } from './types';

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

  constructor() {
    const display = readDisplay();
    this.sort = display.sort;
    this.fields = display.fields;
    makeAutoObservable(this, { period: observableRef });
  }

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
