import { makeAutoObservable } from 'mobx';
import { recordingsService } from 'App/services';
import { IRecord } from 'App/services/RecordingsService';

export default class RecordingsStore {
  recordings: IRecord[] = [];
  loading: boolean;

  page = 1;
  pageSize = 15;
  order: 'desc' | 'asc' = 'desc';
  search = '';
  // later we will add search by user id
  userId = '0';

  constructor() {
    makeAutoObservable(this);
  }

  setRecordings(records: IRecord[]) {
    this.recordings = records;
  }

  setUserId(userId: string) {
    this.userId = userId;
    this.fetchRecordings();
  }

  updateSearch(val: string) {
    this.search = val;
  }
  updatePage(page: number) {
    this.page = page;
  }

  async fetchRecordings() {
    const filter = {
      page: this.page,
      limit: this.pageSize,
      order: this.order,
      search: this.search,
      userId: this.userId === '0' ? undefined : this.userId,
    };

    this.loading = true;
    try {
      const recordings = await recordingsService.fetchRecordings(filter);
      this.setRecordings(recordings);
      return recordings;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async fetchRecordingUrl(id: number): Promise<string> {
    this.loading = true;
    try {
      const recording = await recordingsService.fetchRecording(id);
      return recording.URL;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async deleteRecording(id: number) {
    this.loading = true;
    try {
      const recording = await recordingsService.deleteRecording(id);
      return recording;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async updateRecordingName(id: number, name: string) {
    this.loading = true;
    try {
      const recording = await recordingsService.updateRecordingName(id, name);
      return recording;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }
}
