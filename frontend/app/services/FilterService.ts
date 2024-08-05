import APIClient from 'App/api_client';

export default class FilterService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client ? client : new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetchTopValues = async (key: string) => {
    const response = await this.client.get(`/PROJECT_ID/events/search?type=${key}`);
    return await response.json();
  };
}
