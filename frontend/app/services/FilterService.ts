import APIClient from 'App/api_client';

export default class FilterService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetchTopValues = async (key: string, source?: string) => {
    let path = `/PROJECT_ID/events/search?type=${key}`;
    if (source) {
      path += `&source=${source}`;
    }
    const response = await this.client.get(path);
    return await response.json();
  };
}
