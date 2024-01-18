import BaseService from "App/services/BaseService";

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
  createTag(data: CreateTag) {
    return this.client.post('/tags', data)
      .then(r => r.json())
      .then((response: { data: any; }) => response.data || {})
  }

  getTags() {
    return this.client.get('/tags')
      .then(r => r.json())
      .then((response: { data: any; }) => response.data || {})
  }

  deleteTag(id: number) {
    return this.client.delete(`/tags/${id}`)
      .then(r => r.json())
      .then((response: { data: any; }) => response.data || {})
  }

  updateTagName(id: number, name: string) {
    return this.client.put(`/tags/${id}`, { name })
      .then(r => r.json())
      .then((response: { data: any; }) => response.data || {})
  }
}