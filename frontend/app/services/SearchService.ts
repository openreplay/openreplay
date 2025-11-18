import BaseService from 'App/services/BaseService';

export default class SearchService extends BaseService {
  async fetchSessions(params: any) {
    const r = await this.client.post('/PROJECT_ID/sessions/search', params);
    const j = await r.json();
    return j.data;
  }

  async fetchSavedSearchList() {
    const r = await this.client.get('/PROJECT_ID/sessions/search/saved');
    const j = await r.json();
    return j.data;
  }

  async deleteSavedSearch(searchId: string) {
    const r = await this.client.delete(
      `/PROJECT_ID/sessions/search/saved/${searchId}`,
    );
    const j = await r.json();
    return j.data;
  }

  async fetchFilterSearch(params: any) {
    const r = await this.client.get('/PROJECT_ID/events/search', params);
    const j = await r.json();
    return j.data;
  }

  async saveSavedSearch(data: any) {
    const r = await this.client.post('/PROJECT_ID/sessions/search/save', data);
    const j = await r.json();
    return j.data;
  }

  async updateSavedSearch(searchId: string, data: any) {
    const r = await this.client.put(
      `/PROJECT_ID/sessions/search/saved/${searchId}`,
      data,
    );
    const j = await r.json();
    return j.data;
  }

  async fetchSavedSearch(params?: { limit?: number; offset?: number }) {
    const r = await this.client.get(
      '/PROJECT_ID/sessions/search/saved',
      params,
    );
    const j = await r.json();
    return j;
  }

  async getSavedSearch(searchId: string) {
    const r = await this.client.get(
      `/PROJECT_ID/sessions/search/saved/${searchId}`,
    );
    const j = await r.json();
    return j.data;
  }

  async checkLatestSessions(filter: any) {
    const r = await this.client.post('/PROJECT_ID/sessions/search/ids', filter);
    const j = await r.json();
    return j.data;
  }

  async fetchTopValues(params: Record<string, any>): Promise<any> {
    const url = `/pa/PROJECT_ID/properties/autocomplete`;
    const r = await this.client.get(url, params);
    const j = await r.json();
    return j.data;
  }

  async fetchAutoCompleteValues(params: Record<string, any>): Promise<any> {
    const url = `/pa/PROJECT_ID/properties/autocomplete`;
    const r = await this.client.get(url, params);
    const j = await r.json();
    return j.data;
  }
}
