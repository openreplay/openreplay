import BaseService from './BaseService';

export default class HealthService extends BaseService {
  fetchStatus(isPublic?: boolean): Promise<any> {
    return this.client.get(isPublic ? '/health' : '/healthz')
      .then(r => r.json())
      .then(j => j.data || {})
  }
}