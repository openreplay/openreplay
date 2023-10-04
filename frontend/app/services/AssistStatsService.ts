import APIClient from 'App/api_client';

export interface Member {
  name: string;
  count: number;
}

export interface AssistStatsSession {
  callDuration: number;
  liveDuration: number;
  remoteDuration: number;
  sessionId: string;
  teamMembers: { name: string; id: string }[];
  timestamp: number;
  recordings: {
    recordId: number;
    name: string;
    duration: number;
  }[]
}

export interface SessionsResponse {
  total: number;
  page: number;
  list: AssistStatsSession[];
}

export default class AssistStatsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client ? client : new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetch(path: string, body: Record<string, any>, method: 'get' | 'post') {
    return this.client[method]('/assist-stats/' + path, body).then((r) => r.json());
  }

  getGraphs(range: { start: number; end: number }) {
    return this.fetch('avg', { startTimestamp: range.start, endTimestamp: range.end }, 'get');
  }

  getTopMembers(filters: {
    startTimestamp: number;
    endTimestamp: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ list: Member[]; total: number }> {
    return this.fetch('top-members', filters, 'get');
  }

  getSessions(filters: {
    startTimestamp: number;
    endTimestamp: number;
    sortBy: string;
    userId?: number;
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
  }): Promise<SessionsResponse> {
    return this.fetch('sessions', filters, 'post');
  }

  exportCSV(filters: {
    start: number;
    end: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    return this.fetch('export-csv', filters, 'get')
  }
}
