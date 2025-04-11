import BaseService from 'App/services/BaseService';

export default class IssueReportsService extends BaseService {
  fetchProjects = async () => {
    const r = await this.client.get('/integrations/issues/list_projects');

    return await r.json();
  };

  fetchMeta = async (projectId?: number) => {
    const r = await this.client.get(`/integrations/issues/${projectId}`);

    return await r.json();
  };

  saveIssue = async (sessionId: string, data: any) => {
    const r = await this.client.post(
      `/sessions/${sessionId}/assign/projects/${data.projectId}`,
      data,
    );

    return await r.json();
  };

  fetchIssueIntegrations = async (sessionId: string) => {
    const r = await this.client.get(`/sessions/${sessionId}/assign`);

    return await r.json();
  };
}
