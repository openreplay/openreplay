import BaseService from './BaseService';

export interface WeeklyReport {
  weeklyReport: boolean
}

export default class ConfigService extends BaseService {
  async fetchWeeklyReport(): Promise<WeeklyReport> {
    return this.client.get('/config/weekly_report')
      .then(r => r.json()).then(j => j.data)
  }

  async editWeeklyReport(config: WeeklyReport): Promise<WeeklyReport> {
    return this.client.post('/config/weekly_report', config)
      .then(r => r.json()).then(j => j.data)
  }

  async fetchGettingStarted(): Promise<any> {
    return this.client.get('/boarding')
      .then(r => r.json()).then(j => j.data)
  }
}