import BaseService from './BaseService';

type Nullable<T> = T | null;

interface SearchFilters {
  query: Nullable<string>;
  page: Nullable<number>;
  limit: Nullable<number>;
  sort_by: Nullable<string>;
  sort_order: Nullable<'asc' | 'desc'>;
  is_active: Nullable<boolean>;
  user_id: Nullable<number>;
}

interface Task {
  title: string;
  description: Nullable<string>;
  allow_typing: boolean;
}

interface Test {
  title: string;
  projectId: number;
  created_by: number;
  starting_path: string;
  require_mic: boolean;
  require_camera: boolean;
  description: Nullable<string>;
  guidelines: Nullable<string>;
  conclusion_message: Nullable<string>;
  visibility: boolean;
  tasks: Task[];
}

export default class UxtestingService extends BaseService {
  private readonly prefix = '/usability-tests';

  fetchTestsList(filters: SearchFilters) {
    return this.client.post(this.prefix + 'search/', filters).then((r) => {});
  }

  createTest(test: Test) {
    return this.client.post(this.prefix + '/', test).then((r) => {});
  }

  deleteTest(id: number) {
    return this.client.delete(`${this.prefix}/${id}`).then((r) => {});
  }

  updateTest(id: number, test: Test) {
    return this.client.put(`${this.prefix}/${id}`, test).then((r) => {});
  }

  fetchTest(id: number) {
    return this.client.get(`${this.prefix}/${id}`).then((r) => {});
  }

  fetchTestSessions(id: number, page: number, limit: number) {
    return this.client.get(`${this.prefix}/${id}/sessions`, { page, limit }).then((r) => {});
  }

  fetchTestResponses(id: number, task: number, page: number, limit: number) {
    return this.client
      .get(`${this.prefix}/${id}/responses/${task}`, { page, limit })
      .then((r) => {});
  }

  fetchTestStats(id: number) {
    return this.client.get(`${this.prefix}/${id}/statistics`).then((r) => {});
  }

  fetchTestTaskStats(id: number) {
    return this.client.get(`${this.prefix}/${id}/task-statistics`).then((r) => {});
  }
}
