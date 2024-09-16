import BaseService from './BaseService';

export default class CustomFieldService extends BaseService {
  async fetchList(siteId: string): Promise<any> {
    return this.client.get(siteId ? `/${siteId}/metadata` : '/metadata')
      .then(r => r.json()).then(j => j.data);
  }

  async get(siteId?: string): Promise<any> {
    const url = siteId ? `/${siteId}/metadata` : '/metadata';
    return this.client.get(url)
      .then(r => r.json()).then(j => j.data);
  }

  async create(siteId: string, customField: any): Promise<any> {
    return this.client.post(`/${siteId}/metadata`, customField)
      .then(r => r.json()).then(j => j.data);
  }

  async update(siteId: string, instance: any): Promise<any> {
    return this.client.put(`/${siteId}/metadata/${instance.index}`, instance)
      .then(r => r.json()).then(j => j.data);
  }

  async delete(siteId: string, index: string): Promise<any> {
    return this.client.delete(`/${siteId}/metadata/${index}`)
      .then(r => r.json()).then(j => j.data);
  }
}
