import { client } from '@/mstore';

export interface DistinctProperty {
  autoCaptured: boolean;
  count: number;
  usersCount?: number;
  createdAt: number;
  dataType: string;
  description: string;
  displayName: string;
  name: string;
  possibleTypes: string[];
  queryCount: number;
  sampleValues: string[];
  status: string;
  type: string;
}

export function fetchList(
  source: 'events' | 'users',
  eventName?: string,
): Promise<{
  properties: DistinctProperty[];
  total: number;
}> {
  return client
    .get(`/PROJECT_ID/lexicon/properties`, { source, eventName })
    .then((res) => res.json())
    .then((json) => {
      const safeObj = {
        properties: json.data.properties || [],
        total: json.data.total || 0,
      };
      return safeObj;
    });
}

interface UpdatePropPayload {
  autoCaptured: boolean;
  description: string;
  displayName: string;
  name: string;
  source: string;
  status: string;
}
export function updateProperty(payload: UpdatePropPayload): Promise<void> {
  return client
    .put(`/PROJECT_ID/lexicon/properties`, payload)
    .then((res) => res.json());
}
