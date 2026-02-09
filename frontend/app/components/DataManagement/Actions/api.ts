import { client } from '@/mstore';

export class Action {
  name: string;
  description: string;
  filters: Record<string, unknown>[] = [];
  id: string;
  complexity: number;
  updatedAt: number;

  constructor(data: Partial<Action>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export function fetchActions(): Promise<{
  actions: Action[];
  total: number;
}> {
  return client
    .get('/PROJECT_ID/actions')
    .then((res) => res.json())
    .then((json) => ({
      actions: (json.data.actions || []).map((a: any) => new Action(a)),
      total: json.data.total || 0,
    }));
}

export function fetchAction(actionId: string): Promise<Action> {
  return client
    .get(`/PROJECT_ID/actions/${actionId}`)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}

export function createAction(
  payload: Pick<Action, 'name' | 'description' | 'filters'>,
): Promise<Action> {
  return client
    .post('/PROJECT_ID/actions', payload)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}

export function updateAction(
  actionId: string,
  payload: Pick<Action, 'name' | 'description' | 'filters'>,
): Promise<Action> {
  return client
    .put(`/PROJECT_ID/actions/${actionId}`, payload)
    .then((res) => res.json())
    .then((json) => new Action(json.data));
}
