import { makeAutoObservable } from 'mobx';

import { configService } from 'App/services';

export default class weeklyReportConfigStore {
  public weeklyReport = false;

  /** false until the saved value is known: toggling before that sends a guess */
  public loaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  setReport(value: boolean) {
    this.weeklyReport = value;
  }

  async fetchReport() {
    try {
      const { weeklyReport } = await configService.fetchWeeklyReport();
      this.setReport(weeklyReport);
      this.setLoaded(true);
    } catch (e) {
      console.error(e);
    }
  }

  setLoaded(value: boolean) {
    this.loaded = value;
  }

  /** Rejects on failure; the toggle stays where it was and the page says so. */
  async fetchEditReport(value: boolean) {
    const { weeklyReport } = await configService.editWeeklyReport({
      weeklyReport: value,
    });
    this.setReport(weeklyReport);
  }
}
