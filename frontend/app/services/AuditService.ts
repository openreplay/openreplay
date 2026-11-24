import BaseService from './BaseService';

export default class AuditService extends BaseService {
  all(data: any): Promise<any> {
    return this.client
      .post('/trails', data)
      .then((response) => response.json())
      .then((response) => response.data || []);
  }

  one(id: string): Promise<any> {
    return this.client
      .get(`/trails/${id}`)
      .then((response) => response.json())
      .then((response) => response.data || {});
  }
}
