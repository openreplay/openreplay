import APIClient from 'App/api_client';

export interface Member {
  name: string;
  count: number;
  assistDuration: number;
  callDuration: number;
  controlDuration: number;
  assistCount: number;
}

export interface AssistStatsSession {
  callDuration: number;
  assistDuration: number;
  controlDuration: number;
  sessionId: string;
  teamMembers: { name: string; id: string }[];
  timestamp: number;
  recordings: {
    recordId: number;
    name: string;
    duration: number;
  }[];
}

export type PeriodKeys =
  | 'assistTotal'
  | 'assistAvg'
  | 'callTotal'
  | 'callAvg'
  | 'controlTotal'
  | 'controlAvg';

export interface Graphs {
  currentPeriod: {
    assistTotal: number;
    assistAvg: number;
    callTotal: number;
    callAvg: number;
    controlTotal: number;
    controlAvg: number;
  };
  previousPeriod: {
    assistTotal: number;
    assistAvg: number;
    callTotal: number;
    callAvg: number;
    controlTotal: number;
    controlAvg: number;
  };
  list: {
    time: number;
    assistAvg: number;
    callAvg: number;
    controlAvg: number;
    assistTotal: number;
    callTotal: number;
    controlTotal: number;
  }[];
}

export const generateListData = (list: any[], key: PeriodKeys) =>
  list.map((item) => ({
    timestamp: item.timestamp,
    value: item[key],
  }));

export const defaultGraphs = {
  currentPeriod: {
    assistTotal: 0,
    assistAvg: 0,
    callTotal: 0,
    callAvg: 0,
    controlTotal: 0,
    controlAvg: 0,
  },
  previousPeriod: {
    assistTotal: 0,
    assistAvg: 0,
    callTotal: 0,
    callAvg: 0,
    controlTotal: 0,
    controlAvg: 0,
  },
  list: [],
};

export interface SessionsResponse {
  total: number;
  page: number;
  list: AssistStatsSession[];
}

export default class AssistStatsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetch(path: string, body: Record<string, any>, method: 'get' | 'post') {
    return this.client[method](`/assist-stats/${path}`, body).then((r) =>
      r.json(),
    );
  }

  getGraphs(
    range: { start: number; end: number },
    userId?: number,
  ): Promise<Graphs> {
    return this.fetch(
      'avg',
      { startTimestamp: range.start, endTimestamp: range.end, userId },
      'get',
    );
  }

  getTopMembers(filters: {
    startTimestamp: number;
    endTimestamp: number;
    sort: string;
    order: 'asc' | 'desc';
    userId?: number;
  }): Promise<{ list: Member[]; total: number }> {
    return this.fetch('top-members', filters, 'get');
  }

  getSessions(filters: {
    startTimestamp: number;
    endTimestamp: number;
    sort: string;
    userId?: number;
    order: 'asc' | 'desc';
    page: number;
    limit: number;
  }): Promise<SessionsResponse> {
    return this.fetch('sessions', filters, 'post');
  }

  exportCSV(filters: {
    start: number;
    end: number;
    sort: string;
    order: 'asc' | 'desc';
  }) {
    return this.fetch('export-csv', filters, 'get');
  }
}
