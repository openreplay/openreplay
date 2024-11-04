import { makeAutoObservable } from 'mobx';
import { tagWatchService } from 'App/services';
import { CreateTag, Tag } from 'App/services/TagWatchService';

export default class TagWatchStore {
  tags: Tag[] = [];
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setTags = (tags: Tag[]) => {
    this.tags = tags;
  };

  setLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  getTags = async () => {
    if (this.isLoading) {
      return;
    }
    this.setLoading(true);
    try {
      const tags: Tag[] = await tagWatchService.getTags();
      this.setTags(tags);
      return tags;
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  createTag = async (data: CreateTag) => {
    try {
      const tagId: number = await tagWatchService.createTag(data);
      return tagId;
    } catch (e) {
      console.error(e);
    }
  };

  deleteTag = async (id: number) => {
    try {
      await tagWatchService.deleteTag(id);
      this.setTags(this.tags.filter((t) => t.tagId !== id));
    } catch (e) {
      console.error(e);
    }
  };

  updateTagName = async (id: number, name: string) => {
    try {
      await tagWatchService.updateTagName(id, name);
      const updatedTag = this.tags.find((t) => t.tagId === id)
      if (updatedTag) {
        this.setTags(this.tags.map((t) => t.tagId === id ? { ...updatedTag, name } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };
}
