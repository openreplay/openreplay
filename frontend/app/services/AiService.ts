import BaseService from 'App/services/BaseService';

export default class AiService extends BaseService {
  /**
   * @returns stream of text symbols
   * */
  async getSummary(sessionId: string) {
    const r = await this.client.get(
      `/sessions/${sessionId}/intelligent/summary`,
    );
    return r.body;
  }
}
