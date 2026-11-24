import BaseService from './BaseService';

export default class FilterService extends BaseService {
  fetchProperties = async (
    eventName: string,
    isAutoCapture: boolean = false,
    projectId = 'PROJECT_ID',
  ) => {
    // en = eventName, ac = isAutoCapture
    let path = `/${projectId}/properties/search?en=${eventName}&ac=${isAutoCapture}`;
    const response = await this.client.get(path);
    return await response.json();
  };

  fetchFilters = async (projectId: string) => {
    const response = await this.client.get(`/${projectId}/filters`);
    return await response.json();
  };
}
