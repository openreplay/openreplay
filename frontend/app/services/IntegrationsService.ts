import BaseService from "./BaseService";

export default class IntegrationsService extends BaseService {
  fetchList = async (name) => {
    const r = await this.client.get(`/integrations/${name}`)
    const data = await r.json()

    return data
  }

  fetchIntegration = async (name: string, siteId: string) => {
    const url = siteId && name !== 'github' && name !== 'jira' ? `/${siteId}/integrations/${name}` : `/integrations/${name}`
    const r = await this.client.get(url)
    const data = await r.json()

    return data
  }

  saveIntegration = async (name: string, siteId: string, data: any) => {
    const url = (siteId ? `/${siteId}` : '') + `/integrations/${name}`
    const r = await this.client.post(url, data)
    const res = await r.json()

    return res
  }

  removeIntegration = async (name: string, siteId: string) => {
    const url = (siteId ? `/${siteId}` : '') + `/integrations/${name}`
    const r = await this.client.delete(url)
    const res = await r.json()

    return res
}
