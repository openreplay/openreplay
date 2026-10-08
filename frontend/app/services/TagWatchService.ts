import BaseService from 'App/services/BaseService';

export interface CreateTag {
  name: string;
  selector: string;
  ignoreClickRage: boolean;
  ignoreDeadClick: boolean;
  location?: string;
}

interface TagResponse {
  tags: {
    tagId: number;
    name: string;
    selector: string;
    ignoreClickRage: boolean;
    ignoreDeadClick: boolean;
    location: string | null;
    volume: number;
    users: number;
  }[];
  total: number;
}

/** What the tags API accepts for a name (schemas.TagUpdate). */
export const TAG_NAME_MAX = 100;
export const isValidTagName = (name: string) =>
  name.length > 0 &&
  name.length <= TAG_NAME_MAX &&
  /^[a-zA-Z0-9" -]*$/.test(name);

/** A tag as the list returns it. */
export type TagItem = TagResponse['tags'][number];

export interface Tag extends CreateTag {
  tagId: number;
  volume: number;
  users: number;
}

export default class TagWatchService extends BaseService {
  async createTag(projectId: number, data: CreateTag) {
    const r = await this.client.post(`/${projectId}/tags`, data);
    const response = await r.json();
    return response.data || {};
  }

  async getTags(projectId: number, page = 1, limit = 10): Promise<TagResponse> {
    const r = await this.client.get(
      `/${projectId}/tags?page=${page}&limit=${limit}`,
    );
    const response = await r.json();
    return response.data || {};
  }

  async deleteTag(projectId: number, id: number) {
    const r = await this.client.delete(`/${projectId}/tags/${id}`);
    const response = await r.json();
    return response.data || {};
  }

  async updateTag(
    projectId: number,
    id: number,
    data: { name: string; location?: string },
  ) {
    const r = await this.client.put(`/${projectId}/tags/${id}`, data);
    const response = await r.json();
    return response.data || {};
  }
}
