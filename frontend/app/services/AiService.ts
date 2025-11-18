import BaseService from 'App/services/BaseService';

export default class AiService extends BaseService {
  /**
   * @returns stream of text symbols
   * */
  async getSummary(
    sessionId: string,
    start?: number,
    end?: number,
  ): Promise<string | null> {
    const r = await this.client.post(
      `/sessions/${sessionId}/intelligent/summary`,
      {
        frameStartTimestamp: start,
        frameEndTimestamp: end,
      },
    );

    return r.text();
  }

  async getDetailedSummary(
    sessionId: string,
    networkEvents: any[],
    feat: 'errors' | 'issues' | 'journey',
    start: number,
    end: number,
  ): Promise<string | null> {
    const r = await this.client.post(
      `/sessions/${sessionId}/intelligent/detailed-summary`,
      {
        event: feat,
        frameStartTimestamp: start,
        frameEndTimestamp: end,
        devtoolsEvents: networkEvents,
      },
    );

    return r.text();
  }
}
