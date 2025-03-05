import BaseService from './BaseService';

export default class HealthService extends BaseService {
  async fetchStatus(isPublic?: boolean): Promise<any> {
    const r = await this.client.get(isPublic ? '/health' : '/healthz');
    const j = await r.json();
    return j.data || {};
  }
}
