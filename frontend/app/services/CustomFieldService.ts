import BaseService from './BaseService';

/* the API answers a refused key (e.g. over the limit) with 200 + errors */
const dataOrThrow = (j: { data?: any; errors?: string[] }) => {
  if (!j.data) throw new Error(j.errors?.[0] || 'Could not save the key');
  return j.data;
};

export default class CustomFieldService extends BaseService {
  async fetchList(projectId?: string): Promise<any> {
    return this.client
      .get(projectId ? `/${projectId}/metadata` : '/metadata')
      .then((r) => r.json())
      .then((j) => j.data);
  }

  async get(projectId?: string): Promise<any> {
    const url = projectId ? `/${projectId}/metadata` : '/PROJECT_ID/metadata';
    return this.client
      .get(url)
      .then((r) => r.json())
      .then((j) => j.data);
  }

  async create(projectId: string, customField: any): Promise<any> {
    return this.client
      .post(`/${projectId}/metadata`, customField)
      .then((r) => r.json())
      .then(dataOrThrow);
  }

  async update(projectId: string, instance: any): Promise<any> {
    return this.client
      .post(`/${projectId}/metadata/${instance.index}`, instance)
      .then((r) => r.json())
      .then(dataOrThrow);
  }

  async delete(projectId: string, index: string): Promise<any> {
    return this.client
      .delete(`/${projectId}/metadata/${index}`)
      .then((r) => r.json())
      .then((j) => j.data);
  }
}
