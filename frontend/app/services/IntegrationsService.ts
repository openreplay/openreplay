import BaseService from './BaseService';

export default class IntegrationsService extends BaseService {
  fetchList = async (name?: string, siteId?: string) => {
    const r = await this.client.get(
      `${siteId ? `/${siteId}` : ''}/integrations${name ? `/${name}` : ''}`,
    );
    const data = await r.json();

    return data;
  };

  fetchIntegration = async (name: string, siteId: string) => {
    const url =
      siteId && name !== 'github' && name !== 'jira'
        ? `/${siteId}/integrations/${name}`
        : `/integrations/${name}`;
    const r = await this.client.get(url);
    const data = await r.json();

    return data;
  };

  saveIntegration = async (name: string, data: any, siteId?: string) => {
    try {
      const url = `${siteId ? `/${siteId}` : ''}/integrations/${name}`;
      const r = await this.client.post(url, data);
      return await r.json();
    } catch (e: any) {
      if (e.response) {
        const errorData = await e.response.json();
        return { errors: errorData.errors };
      }
      return { errors: ['An unexpected error occurred.'] };
    }
  };

  removeIntegration = async (name: string, siteId?: string) => {
    const url = `${siteId ? `/${siteId}` : ''}/integrations/${name}`;
    const r = await this.client.delete(url);

    return await r.json();
  };

  fetchMessengerChannels = async (name: string) => {
    const r = await this.client.get(`/integrations/${name}/channels`);

    return await r.json();
  };

  updateMessengerInt = async (name: string, data: any) => {
    try {
      const r = await this.client.post(
        `/integrations/${name}/${data.webhookId}`,
        data,
      );
      return await r.json();
    } catch (e: any) {
      if (e.response) {
        const errorData = await e.response.json();
        return { errors: errorData.errors };
      }
      return { errors: ['An unexpected error occurred.'] };
    }
  };

  removeMessengerInt = async (name: string, webhookId: string) => {
    const r = await this.client.delete(`/integrations/${name}/${webhookId}`);

    return await r.json();
  };

  sendMsg = async (integrationId, entity, entityId, name, data) => {
    const r = await this.client.post(
      `/integrations/${name}/notify/${integrationId}/${entity}/${entityId}`,
      data,
    );

    return await r.json();
  };

  testElastic = async (data: any) => {
    const r = await this.client.post('/integrations/elasticsearch/test', data);

    return r.json();
  };
}
