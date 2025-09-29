import APIClient from 'App/api_client';

export default class FilterService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetchTopValues = async (name: string, source?: string, isLive?: boolean) => {
    // const r = await this.client.get('/PROJECT_ID/events/search', params);
    // https://foss.openreplay.com/api/65/events/search?name=user_device_type&isEvent=false&q=sd

    // let path = `/PROJECT_ID/events/search?type=${key}`;
    let path = `/PROJECT_ID/events/search?type=${name}`;
    if (source) {
      path += `&source=${source}`;
    }
    if (isLive !== undefined) {
      path += `&live=true`;
    }
    const response = await this.client.get(path);
    return await response.json();
  };

  fetchProperties = async (
    eventName: string,
    isAutoCapture: boolean = false,
  ) => {
    // en = eventName, ac = isAutoCapture
    let path = `/pa/PROJECT_ID/properties/search?en=${eventName}&ac=${isAutoCapture}`;
    const response = await this.client.get(path);
    return await response.json();
  };

  fetchFilters = async (projectId: string) => {
    const response = await this.client.get(`/pa/${projectId}/filters`);
    return await response.json();
  };
}
