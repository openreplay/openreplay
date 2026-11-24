import IFunnel from 'App/mstore/types/funnel';

import BaseService from './BaseService';

export default class FunnelService extends BaseService {
  all(): Promise<any[]> {
    return this.client
      .get('/funnels')
      .then((response) => response.json())
      .then((response) => response.data || []);
  }

  one(funnelId: string): Promise<any> {
    return this.client
      .get(`/funnels/${funnelId}`)
      .then((response) => response.json());
  }

  save(funnel: IFunnel): Promise<any> {
    return this.client
      .post('/funnels', funnel)
      .then((response) => response.json());
  }

  delete(funnelId: string): Promise<any> {
    return this.client
      .delete(`/funnels/${funnelId}`)
      .then((response) => response.json());
  }

  fetchIssues(funnelId?: string, payload?: any): Promise<any> {
    const path = funnelId ? `/funnels/${funnelId}/issues` : '/funnels/issues';
    return this.client
      .post(path, payload)
      .then((response) => response.json())
      .then((response) => response.data || []);
  }
}
