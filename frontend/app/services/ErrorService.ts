import BaseService from './BaseService';

export default class ErrorService extends BaseService {
  fetchError = async (id: string) => {
    const r = await this.client.get(`/errors/${id}`);

    return await r.json();
  };

  fetchErrorList = async (params: Record<string, any>) => {
    const r = await this.client.post('/errors/search', params);

    return await r.json();
  };

  fetchErrorTrace = async (id: string) => {
    const r = await this.client.get(`/errors/${id}/sourcemaps`);

    return await r.json();
  };

  fetchNewErrorsCount = async (params: any) => {
    const r = await this.client.get('/errors/stats', params);

    return await r.json();
  };
}
