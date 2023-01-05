import { makeAutoObservable }from "mobx"
import { configService } from "App/services";

export default class weeklyReportConfigStore {
  public weeklyReport = false

  constructor() {
    makeAutoObservable(this)
  }

  setReport(value: boolean) {
    this.weeklyReport = value
  }

  async fetchReport() {
    try {
      const { weeklyReport } = await configService.fetchWeeklyReport()
      return this.setReport(weeklyReport)
    } catch (e) {
      console.error(e)
    }
  }

  async fetchEditReport(value: boolean) {
    try {
      const { weeklyReport } = await configService.editWeeklyReport({ weeklyReport: value })
      return this.setReport(weeklyReport)
    } catch (e) {
      console.error(e)
    }
  }
}