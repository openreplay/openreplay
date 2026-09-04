import APIClient from 'App/api_client';

export default class FilterService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  // UNUSED CODE ?
  fetchTopValues = async (name: string, source?: string, isLive?: boolean) => {
    const response = await this.client.get(
      '/PROJECT_ID/properties/autocomplete',
      {
        propertyName: name,
        source,
        live: isLive ? true : undefined,
      },
    );
    return await response.json();
  };

  fetchProperties = async (
    eventName: string,
    isAutoCapture: boolean = false,
  ) => {
    // en = eventName, ac = isAutoCapture
    let path = `/PROJECT_ID/properties/search?en=${eventName}&ac=${isAutoCapture}`;
    const response = await this.client.get(path);
    return await response.json();
  };

  fetchFilters = async (projectId: string) => {
    const response = await this.client.get(`/${projectId}/filters`);
    return await response.json();
  };
}
