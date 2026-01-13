import { client } from '@/mstore';

export interface DistinctEvent {
  name: string;
  displayName: string;
  description: string;
  count: number;
  queryCount: number;
  status: string;
  createdAt: number;
  autoCaptured: boolean;
}

export function fetchList(): Promise<{
  events: DistinctEvent[];
  total: number;
}> {
  return client
    .get('/PROJECT_ID/lexicon/events')
    .then((res) => res.json())
    .then((json) => json.data);
}

interface UpdateEventPayload {
  autoCaptured: boolean;
  description: string;
  displayName: string;
  name: string;
  status: string;
}

export function updateEventProperty(
  payload: UpdateEventPayload,
): Promise<void> {
  return client
    .put(`/PROJECT_ID/lexicon/events`, payload)
    .then((res) => res.json());
}
