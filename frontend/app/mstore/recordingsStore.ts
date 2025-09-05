import { makeAutoObservable } from 'mobx';
import { recordingsService } from 'App/services';
import { IRecord } from 'App/services/RecordingsService';
import Period, { LAST_7_DAYS } from 'Types/app/period';

export default class RecordingsStore {
  recordings: IRecord[] = [];
  loading: boolean;
  page = 1;
  total: number = 0;
  pageSize = 5;
  order: 'desc' | 'asc' = 'desc';
  search = '';
  startTimestamp = 0;
  endTimestamp = 0;
  rangeName: string = 'LAST_24_HOURS';
  period: any = Period({ rangeName: LAST_7_DAYS });

  exportedVideosList: any = [];
  currentUser = false;

  constructor() {
    makeAutoObservable(this);
  }

  setCurrUser = (val: boolean) => {
    this.currentUser = val;
    this.page = 1;
  }

  setRecordings(records: IRecord[], total?: number) {
    this.total = total || 0;
    this.recordings = records;
  }

  updateSearch(val: string) {
    this.search = val;
    this.page = 1;
  }

  updateTimestamps(period: any): void {
    const { start, end, rangeName } = period;
    this.period = Period({ start, end, rangeName });
    this.page = 1;
  }

  updatePage(page: number) {
    this.page = page;
  }

  async fetchRecordings() {
    const filter = {
      page: this.page,
      limit: this.pageSize,
      order: this.order,
      query: this.search,
      startTimestamp: this.period.start,
      endTimestamp: this.period.end,
    };

    this.loading = true;
    try {
      const response: { records: []; total: number } =
        await recordingsService.fetchRecordings(filter);
      this.setRecordings(response.records, response.total);
      return response.records;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async fetchRecordingUrl(id: number): Promise<string | undefined> {
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

  triggerExport = async (sessionId: string) => {
    return true;
  }

  getRecordings = async () => {
    const params = {
      page: this.page,
      limit: 10,
      order: this.order,
      currentUser: this.currentUser,
      // query: this.search,
      // startTimestamp: this.period.start,
      // endTimestamp: this.period.end,
    };
  }

  resetValues = () => {
    this.recordings = [];
    this.loading = false;
    this.page = 1;
    this.total = 0;
    this.pageSize = 5;
    this.order = 'desc';
    this.search = '';
    this.startTimestamp = 0;
    this.endTimestamp = 0;
    this.rangeName = 'LAST_24_HOURS';
    this.period = Period({ rangeName: LAST_7_DAYS });
    this.exportedVideosList = [];
  }
}
