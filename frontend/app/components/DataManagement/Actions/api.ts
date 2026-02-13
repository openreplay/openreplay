import { client, filterStore } from '@/mstore';
import FilterItem from '@/mstore/types/filterItem';

export class Action {
  name: string;
  description: string;
  filters: FilterItem[] = [];
  id: string;
  complexity: number;
  updatedAt: number;
  isPublic: boolean;

  constructor(data?: Partial<ApiAction>) {
    if (data) {
      this.name = data.name || '';
      this.description = data.description || '';
      this.filters = data.filters
        ? filterStore.processFiltersFromData(data.filters)
        : [];
      this.isPublic = data.isPublic || false;
      this.id = data.actionId || '';
      this.updatedAt = data.updatedAt || 0;
      this.complexity = this.filters.length;
    }
  }
}

interface ApiAction {
  actionId: string;
  createdAt: number;
  description: string;
  filters: Record<string, unknown>[];
  isPublic: boolean;
  name: string;
  projectId: number;
  updatedAt: number;
  userId: number;
}

interface SearchActionsParams {
  limit: number;
  page: number;
  name?: string;
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  userId?: number;
}

export function fetchActions(params: SearchActionsParams): Promise<{
  actions: Action[];
  total: number;
}> {
  return client
    .post('/PROJECT_ID/lexicon/actions/search', params)
    .then((res) => res.json())
    .then((json) => ({
      actions: (json.data.actions || []).map((a: ApiAction) => new Action(a)),
      total: json.data.total || 0,
    }));
}

export function fetchAction(actionId: string): Promise<Action> {
  return client
    .get(`/PROJECT_ID/lexicon/actions/${actionId}`)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}

export function createAction(
  payload: Pick<Action, 'name' | 'description' | 'filters'>,
): Promise<Action> {
  return client
    .post('/PROJECT_ID/lexicon/actions', payload)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}

export function deleteAction(actionId: string): Promise<any> {
  return client.delete(`/PROJECT_ID/lexicon/actions/${actionId}`);
}

export function updateAction(
  actionId: string,
  payload: Pick<Action, 'name' | 'description' | 'filters'>,
): Promise<Action> {
  return client
    .put(`/PROJECT_ID/lexicon/actions/${actionId}`, payload)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}
