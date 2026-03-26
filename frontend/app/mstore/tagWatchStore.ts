import { projectStore } from '@/mstore';
import { makeAutoObservable } from 'mobx';

import { tagWatchService } from 'App/services';
import { CreateTag, Tag } from 'App/services/TagWatchService';

export default class TagWatchStore {
  tags: Tag[] = [];
  total = 0;
  page = 1;
  limit = 10;

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

  getTags = async (projectId?: number, page?: number) => {
    if (this.isLoading) {
      return;
    }
    if (page !== undefined) {
      this.page = page;
    }
    this.setLoading(true);
    try {
      const pid = projectId || projectStore.active?.projectId;
      const resp = await tagWatchService.getTags(pid!, this.page, this.limit);
      this.setTags(resp.tags || []);
      this.total = resp.total || 0;
      return resp.tags;
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  createTag = async (data: CreateTag, projectId?: number) => {
    try {
      const pid = projectId || projectStore.active?.projectId;
      const tagId: number = await tagWatchService.createTag(pid!, data);
      return tagId;
    } catch (e) {
      console.error(e);
    }
  };

  deleteTag = async (id: number, projectId?: number) => {
    try {
      const pid = projectId || projectStore.active?.projectId;
      await tagWatchService.deleteTag(pid!, id);
      this.setTags(this.tags.filter((t) => t.tagId !== id));
    } catch (e) {
      console.error(e);
    }
  };

  updateTag = async (
    id: number,
    data: { name: string; location?: string },
    projectId?: number,
  ) => {
    try {
      const pid = projectId || projectStore.active?.projectId;
      await tagWatchService.updateTag(pid!, id, data);
      const updatedTag = this.tags.find((t) => t.tagId === id);
      if (updatedTag) {
        this.setTags(
          this.tags.map((t) =>
            t.tagId === id ? { ...updatedTag, ...data } : t,
          ),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };
}
