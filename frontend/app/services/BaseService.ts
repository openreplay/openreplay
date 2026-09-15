import APIClient, { apiClient } from 'App/api_client';

export default class BaseService {
  client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || apiClient;
  }

  initClient(client?: APIClient) {
    this.client = client || apiClient;
  }
}
