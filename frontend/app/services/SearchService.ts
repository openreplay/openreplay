import BaseService from 'App/services/BaseService';

export default class SearchService extends BaseService {
  async fetchSessions(params: any) {
    const r = await this.client.post('/PROJECT_ID/sessions/search', params);
    const j = await r.json();
    return j.data;
  }

  async fetchSavedSearchList() {
    const r = await this.client.get('/PROJECT_ID/saved_search');
    const j = await r.json();
    return j.data;
  }

  async deleteSavedSearch(id: string) {
    const r = await this.client.delete(`/saved_search/${id}`);
    const j = await r.json();
    return j.data;
  }

  async fetchFilterSearch(params: any) {
    const r = await this.client.get('/PROJECT_ID/events/search', params);
    const j = await r.json();
    return j.data;
  }

  async saveSavedSearch(data: any, id: string) {
    const r = await this.client.post(
      id ? `/PROJECT_ID/saved_search/${id}` : '/PROJECT_ID/saved_search',
      data,
    );
    const j = await r.json();
    return j.data;
  }

  async fetchSavedSearch() {
    const r = await this.client.get('/PROJECT_ID/saved_search');
    const j = await r.json();
    return j.data;
  }

  async checkLatestSessions(filter: any) {
    const r = await this.client.post('/PROJECT_ID/sessions/search/ids', filter);
    const j = await r.json();
    return j.data;
  }

  async fetchAutoCompleteValues(params: {}): Promise<any> {
    const r = await this.client.get('/PROJECT_ID/events/search', params);
    const j = await r.json();
    return j.data;
  }
}
