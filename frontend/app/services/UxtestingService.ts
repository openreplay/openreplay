import BaseService from './BaseService';

type Nullable<T> = T | null;

export interface UxTSearchFilters {
  query: Nullable<string>;
  page: Nullable<number>;
  limit: Nullable<number>;
  sortBy: Nullable<string>;
  sortOrder: Nullable<'asc' | 'desc'>;
  isActive: Nullable<boolean>;
  userId: Nullable<number>;
}

export interface UxTask {
  title: string;
  description: Nullable<string>;
  allowTyping: boolean;
  taskId?: number;
}

export interface UxTest {
  title: string;
  startingPath: string;
  requireMic: boolean;
  requireCamera: boolean;
  description: Nullable<string>;
  guidelines: Nullable<string>;
  conclusionMessage: Nullable<string>;
  visibility: boolean;
  tasks: UxTask[];
  status: string;
}

export interface UxTListEntry {
  createdAt: string;
  status: 'preview' | 'in-progress' | 'paused' | 'closed';
  createdBy: {
    userId: number;
    name: string;
  };
  description: string;
  testId: number;
  title: string;
  updatedAt: string;
}

export default class UxtestingService extends BaseService {
  private readonly prefix = '/usability-tests';

  async fetchTestsList(
    filters: Partial<UxTSearchFilters>,
  ): Promise<{ list: UxTListEntry[]; total: number }> {
    const r = await this.client.post(`${this.prefix}/search`, filters);
    const j = await r.json();
    return j.data || [];
  }

  async createTest(test: UxTest) {
    const r = await this.client.post(this.prefix, test);
    const j = await r.json();
    return j.data || [];
  }

  async deleteTest(id: number) {
    const r = await this.client.delete(`${this.prefix}/${id}`);
    return await r.json();
  }

  updateTest(id: number, test: UxTest) {
    return this.client
      .put(`${this.prefix}/${id}`, test)
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  async fetchTest(id: string) {
    const r = await this.client.get(`${this.prefix}/${id}`);
    const j = await r.json();
    return j.data || [];
  }

  async fetchTestSessions(
    id: string,
    page: number,
    limit: number,
    isLive?: boolean,
    userId?: string,
  ) {
    const r = await this.client.get(`${this.prefix}/${id}/sessions`, {
      page,
      limit,
      live: isLive,
      userId,
    });
    return await r.json();
  }

  async fetchTaskResponses(
    id: number,
    task: number,
    page: number,
    limit: number,
    query?: string,
  ) {
    const r = await this.client.get(`${this.prefix}/${id}/responses/${task}`, {
      page,
      limit,
      query,
    });
    const j = await r.json();
    return j.data || [];
  }

  async fetchTestStats(id: string) {
    const r = await this.client.get(`${this.prefix}/${id}/statistics`);
    const j = await r.json();
    return j.data || [];
  }

  async fetchTestTaskStats(id: string) {
    const r = await this.client.get(`${this.prefix}/${id}/task-statistics`);
    const j = await r.json();
    return j.data || [];
  }
}
