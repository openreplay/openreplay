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
    const response = await this.client.post('/projects', projectData);
    return response.json();
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
