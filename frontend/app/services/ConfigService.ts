import BaseService from './BaseService';

export default class ConfigService extends BaseService {
  async fetchGettingStarted(): Promise<any> {
    return this.client
      .get('/boarding')
      .then((r) => r.json())
      .then((j) => j.data);
  }

  async checkElasticConnection(params: any): Promise<any> {
    return this.client
      .post('/integartions/elasticsearch/test', params)
      .then((r) => r.json())
      .then((j) => j.data);
  }
}
