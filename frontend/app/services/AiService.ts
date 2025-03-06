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

    return r.json();
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

    return r.json();
  }

  async getSearchFilters(query: string): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/search', {
      question: query,
    });
    const { data } = await r.json();
    return data;
  }

  async getCardFilters(
    query: string,
    chartType?: string,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/search-plus', {
      question: query,
      chartType,
    });
    const { data } = await r.json();
    return data;
  }

  async omniSearch(
    query: string,
    filters: Record<any, any>,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/ask-or/charts', {
      ...filters,
      question: query,
      metricType: 'omnisearch',
    });
    const { data } = await r.json();
    return data;
  }

  async getCardData(
    query: string,
    chartData: Record<string, any>,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/ask-or/charts', {
      ...chartData,
      question: query,
    });
    const { data } = await r.json();
    return data;
  }
}
