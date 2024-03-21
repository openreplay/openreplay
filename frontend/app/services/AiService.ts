import BaseService from 'App/services/BaseService';

export default class AiService extends BaseService {
  /**
   * @returns stream of text symbols
   * */
  async getSummary(sessionId: string): Promise<string | null> {
    const r = await this.client.post(
      `/sessions/${sessionId}/intelligent/summary`,
    );

    return r.json()
  }

  async getSearchFilters(query: string): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/search', {
      question: query
    })
    const { data } = await r.json();
    return data
  }
}
