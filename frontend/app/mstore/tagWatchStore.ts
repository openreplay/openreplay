import { makeAutoObservable } from 'mobx';
import { tagWatchService } from 'App/services';
import { CreateTag, Tag } from 'App/services/TagWatchService';

export default class TagWatchStore {
  tags: Tag[] = [];
  isLoading = true;

  constructor() {
    makeAutoObservable(this);
  }

  setTags(tags: Tag[]) {
    this.tags = tags;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  async getTags() {
    this.setLoading(true);
    try {
      const tags: Tag[] = await tagWatchService.getTags();
      this.setTags(tags);
      return tags
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  }

  async createTag(data: CreateTag) {
    try {
      const tag = await tagWatchService.createTag(data);
      this.setTags([...this.tags, tag]);
    } catch (e) {
      console.error(e);
    }
  }

  async deleteTag(id: number) {
    try {
      await tagWatchService.deleteTag(id);
      this.setTags(this.tags.filter(t => t.tagId !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async updateTagName(id: number, name: string) {
    try {
      const tag = await tagWatchService.updateTagName(id, name);
      this.setTags(this.tags.map(t => t.tagId === tag.tagId ? tag : t));
    } catch (e) {
      console.error(e);
    }
  }
}
