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
    }
  }
}

interface ApiSegment {
  searchId: string | number;
  name: string;
  isPublic: boolean;
  userId?: number;
  createdAt?: number;
  updatedAt?: number;
  data?: { filters: Record<string, unknown>[] };
  filter?: { filters: Record<string, unknown>[] };
}

interface SearchSegmentsParams {
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

const toPayload = (payload: Pick<Segment, 'name' | 'isPublic' | 'filters'>) => ({
  name: payload.name || null,
  isPublic: Boolean(payload.isPublic),
  isShare: false,
  data: {
    filters: (payload.filters as any[]).map((f) => {
      const base = typeof (f as any)?.toJson === 'function'
        ? (f as any).toJson()
        : f;
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
  name ? list.filter((s) => s.name?.toLowerCase().includes(name.toLowerCase())) : list;

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

export function fetchSegments(params: SearchSegmentsParams): Promise<{
  segments: Segment[];
  total: number;
}> {
  return client
    .get('/PROJECT_ID/sessions/search/saved')
    .then((res) => res.json())
    .then((json) => {
      const rawList: ApiSegment[] = json.data?.data || json.data || [];
      const filtered = byNameFilter(rawList, params.name);
      const all = filtered.map((s) => new Segment(s));
      const sorted = sortSegments(all, params.sortBy, params.sortOrder);
      const start = (params.page - 1) * params.limit;
      const page = sorted.slice(start, start + params.limit);
      return { segments: page, total: sorted.length };
    });
}

export function fetchSegment(segmentId: string): Promise<Segment> {
  return client
    .get(`/PROJECT_ID/sessions/search/saved/${segmentId}`)
    .then((res) => res.json())
    .then((json) => new Segment(json.data));
}

export function createSegment(
  payload: Pick<Segment, 'name' | 'isPublic' | 'filters'>,
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
  payload: Pick<Segment, 'name' | 'isPublic' | 'filters'>,
): Promise<Segment> {
  return client
    .put(`/PROJECT_ID/sessions/search/saved/${segmentId}`, toPayload(payload))
    .then((res) => res.json())
    .then((json) => new Segment(json.data));
}
