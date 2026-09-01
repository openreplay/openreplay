import { client, filterStore } from '@/mstore';
import FilterItem from '@/mstore/types/filterItem';

export class Segment {
  name: string;
  filters: FilterItem[] = [];
  id: string;
  updatedAt: number;
  createdAt: number;
  isPublic: boolean;
  userId?: number;
  /** creator display name (server-provided; may be "") */
  userName: string = '';
  sessionsCount: number = 0;
  usersCount: number = 0;
  /** the agent captures/analyses this segment (server-owned) */
  isCapture: boolean = false;
  /** total sessions the segment has matched (windowless), distinct from the
      windowed sessionsCount */
  totalSessionCount: number = 0;
  /** traffic estimate — 0 means "no estimate", not "zero traffic" */
  trafficPct: number = 0;
  sessionsPerDay: number = 0;

  constructor(data?: Partial<ApiSegment>) {
    if (data) {
      this.name = data.name || '';
      const rawFilters = data.data?.filters ?? data.filter?.filters ?? [];
      this.filters = rawFilters.length
        ? filterStore.processFiltersFromData(rawFilters)
        : [];
      this.isPublic = data.isPublic || false;
      this.id = data.searchId ? String(data.searchId) : '';
      this.updatedAt = data.updatedAt || data.createdAt || 0;
      this.createdAt = data.createdAt || 0;
      this.userId = data.userId;
      this.userName = data.userName ?? '';
      this.sessionsCount = data.sessionsCount ?? 0;
      this.usersCount = data.usersCount ?? 0;
      this.isCapture = Boolean(data.isCapture);
      this.totalSessionCount = data.totalSessionCount ?? 0;
      this.trafficPct = data.trafficPct ?? 0;
      this.sessionsPerDay = data.sessionsPerDay ?? 0;
    }
  }
}

interface ApiSegment {
  searchId: string | number;
  name: string;
  isPublic: boolean;
  userId?: number;
  userName?: string;
  createdAt?: number;
  updatedAt?: number;
  sessionsCount?: number;
  usersCount?: number;
  isCapture?: boolean;
  totalSessionCount?: number;
  trafficPct?: number;
  sessionsPerDay?: number;
  data?: { filters: Record<string, unknown>[] };
  filter?: { filters: Record<string, unknown>[] };
}

export interface SearchSegmentsParams {
  limit: number;
  page: number;
  name?: string;
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

const ensureFilterFields = (filter: any): any => ({
  ...filter,
  name: filter.name || filter.type,
  type: filter.type || filter.name,
  dataType: filter.dataType || 'string',
  operator: filter.operator || 'is',
  propertyOrder: filter.propertyOrder || (filter.isEvent ? 'then' : 'and'),
  filters: Array.isArray(filter.filters)
    ? filter.filters.map(ensureFilterFields)
    : [],
});

const toPayload = (
  payload: Pick<Segment, 'name' | 'isPublic' | 'filters'> &
    Partial<Pick<Segment, 'isCapture'>>,
) => ({
  name: payload.name || null,
  isPublic: Boolean(payload.isPublic),
  isShare: false,
  // "Identify issues in this segment" — the agent-capture flag on the saved search
  ...(payload.isCapture === undefined
    ? {}
    : { isCapture: Boolean(payload.isCapture) }),
  data: {
    filters: (payload.filters as any[]).map((f) => {
      const base =
        typeof (f as any)?.toJson === 'function' ? (f as any).toJson() : f;
      return ensureFilterFields(base);
    }),
    sort: 'startTs',
    order: 'desc',
    eventsOrder: 'then',
    limit: 10,
    page: 1,
  },
});

const byNameFilter = (list: ApiSegment[], name?: string) =>
  name
    ? list.filter((s) => s.name?.toLowerCase().includes(name.toLowerCase()))
    : list;

const sortSegments = (
  list: Segment[],
  sortBy: SearchSegmentsParams['sortBy'],
  sortOrder: SearchSegmentsParams['sortOrder'],
): Segment[] => {
  const sign = sortOrder === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = (a as any)[sortBy] ?? 0;
    const bv = (b as any)[sortBy] ?? 0;
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * sign;
    }
    return (Number(av) - Number(bv)) * sign;
  });
};

/** Server rows -> Segment models. Rows are held by the search store, which owns
    the single saved-search request the whole app shares. */
export function mapSegments(rows: unknown[]): Segment[] {
  return (rows as ApiSegment[]).map((s) => new Segment(s));
}

/* Name filter, sort and paging all run over the whole set — the saved-search
   list is loaded in full, and server paging would have sorted within a page. */
export function selectSegments(
  rows: unknown[],
  params: SearchSegmentsParams,
): { segments: Segment[]; total: number } {
  const filtered = byNameFilter(rows as ApiSegment[], params.name);
  const sorted = sortSegments(
    mapSegments(filtered),
    params.sortBy,
    params.sortOrder,
  );
  const offset = params.limit * (params.page - 1);
  return {
    segments: sorted.slice(offset, offset + params.limit),
    total: sorted.length,
  };
}

export function fetchSegment(segmentId: string): Promise<Segment> {
  return client
    .get(`/PROJECT_ID/sessions/search/saved/${segmentId}`)
    .then((res) => res.json())
    .then((json) => new Segment(json.data));
}

export function createSegment(
  payload: Pick<Segment, 'name' | 'isPublic' | 'filters'> &
    Partial<Pick<Segment, 'isCapture'>>,
): Promise<Segment> {
  return client
    .post('/PROJECT_ID/sessions/search/save', toPayload(payload))
    .then((res) => res.json())
    .then((json) => new Segment(json.data));
}

export function deleteSegment(segmentId: string): Promise<any> {
  return client.delete(`/PROJECT_ID/sessions/search/saved/${segmentId}`);
}

export function updateSegment(
  segmentId: string,
  payload: Pick<Segment, 'name' | 'isPublic' | 'filters'> &
    Partial<Pick<Segment, 'isCapture'>>,
): Promise<Segment> {
  return client
    .put(`/PROJECT_ID/sessions/search/saved/${segmentId}`, toPayload(payload))
    .then((res) => res.json())
    .then((json) => new Segment(json.data));
}
