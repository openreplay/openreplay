import BaseService from './BaseService';

export default class ProjectsService extends BaseService {
  fetchGDPR = async (siteId: string) => {
    const r = await this.client.get(`/${siteId}/gdpr`);

    return await r.json();
  };

  saveGDPR = async (siteId: string, gdprData: any) => {
    const r = await this.client.post(`/${siteId}/gdpr`, gdprData);

    return await r.json();
  };

  fetchList = async () => {
    const r = await this.client.get('/projects');

    return await r.json();
  };

  saveProject = async (projectData: any): Promise<any> => {
    try {
      const response = await this.client.post('/projects', projectData);
      return response.json();
    } catch (error: any) {
      if (error.response) {
        const errorData = await error.response.json();
        throw errorData.errors?.[0] || 'An error occurred while saving the project.';
      }

      throw 'An unexpected error occurred.';
    }
  };

  removeProject = async (projectId: string) => {
    const r = await this.client.delete(`/projects/${projectId}`);

    return await r.json();
  };

  updateProject = async (projectId: string, projectData: any) => {
    const r = await this.client.put(`/projects/${projectId}`, projectData);

    return await r.json();
  };
}
