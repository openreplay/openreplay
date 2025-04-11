import APIClient from 'App/api_client';

export default class AuditService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

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
