import BaseService from './BaseService';

export default class HealthService extends BaseService {
  fetchStatus(): Promise<any> {
    return this.client.get('/health')
      .then(r => r.json())
      .then(j => j.data || {})
  }
}