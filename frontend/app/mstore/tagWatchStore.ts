import { makeAutoObservable } from 'mobx';
import { tagWatchService } from 'App/services';
import { CreateTag, Tag } from 'App/services/TagWatchService';

export default class TagWatchStore {
  tags: Tag[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  setTags(tags: Tag[]) {
    this.tags = tags;
  }

  async getTags() {
    try {
      const tags = await tagWatchService.getTags();
      this.setTags(tags);
    } catch (e) {
      console.error(e);
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

  async deleteTag(id: string) {
    try {
      await tagWatchService.deleteTag(id);
      this.setTags(this.tags.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async updateTagName(id: string, name: string) {
    try {
      const tag = await tagWatchService.updateTagName(id, name);
      this.setTags(this.tags.map(t => t.id === tag.id ? tag : t));
    } catch (e) {
      console.error(e);
    }
  }
}
