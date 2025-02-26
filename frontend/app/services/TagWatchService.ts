import BaseService from 'App/services/BaseService';

export interface CreateTag {
  name: string;
  selector: string;
  ignoreClickRage: boolean;
  ignoreDeadClick: boolean;
}

export interface Tag extends CreateTag {
  tagId: number;
}

export default class TagWatchService extends BaseService {
  async createTag(projectId: number, data: CreateTag) {
    const r = await this.client.post(`/${projectId}/tags`, data);
    const response = await r.json();
    return response.data || {};
  }

  async getTags(projectId: number) {
    const r = await this.client.get(`/${projectId}/tags`);
    const response = await r.json();
    return response.data || {};
  }

  async deleteTag(projectId: number, id: number) {
    const r = await this.client.delete(`/${projectId}/tags/${id}`);
    const response = await r.json();
    return response.data || {};
  }

  async updateTagName(projectId: number, id: number, name: string) {
    const r = await this.client.put(`/${projectId}/tags/${id}`, { name });
    const response = await r.json();
    return response.data || {};
  }
}
