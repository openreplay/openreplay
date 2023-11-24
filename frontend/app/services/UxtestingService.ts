import BaseService from "./BaseService";

type Nullable<T> = T | null;

export interface UxTSearchFilters {
  query: Nullable<string>;
  page: Nullable<number>;
  limit: Nullable<number>;
  sort_by: Nullable<string>;
  sort_order: Nullable<"asc" | "desc">;
  is_active: Nullable<boolean>;
  user_id: Nullable<number>;
}

export interface UxTask {
  title: string;
  description: Nullable<string>;
  allow_typing: boolean;
}

export interface UxTest {
  title: string;
  starting_path: string;
  require_mic: boolean;
  require_camera: boolean;
  description: Nullable<string>;
  guidelines: Nullable<string>;
  conclusion_message: Nullable<string>;
  visibility: boolean;
  tasks: UxTask[];
}

export interface UxTListEntry {
 createdAt: string;
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
    filters: Partial<UxTSearchFilters>
  ): Promise<{ list: UxTListEntry[]; total: number }> {
    const r = await this.client.post(this.prefix + '/search', filters);
    const j = await r.json();
    return j.data || [];
  }

  async createTest(test: UxTest) {
    const r = await this.client.post(this.prefix, test);
    const j = await r.json();
    return j.data || [];
  }

  deleteTest(id: number) {
    return this.client
      .delete(`${this.prefix}/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || []);
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

  fetchTestSessions(id: string, page: number, limit: number) {
    return this.client
      .get(`${this.prefix}/${id}/sessions`, { page, limit })
      .then((r) => r.json())
  }

  fetchTaskResponses(id: string, task: number, page: number, limit: number) {
    return this.client
      .get(`${this.prefix}/${id}/responses/${task}`, { page, limit })
      .then((r) => r.json())
      .then((j) => j.data || []);
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
