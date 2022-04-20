import { IFunnel } from "App/mstore/types/funnel"
import APIClient from 'App/api_client';

export interface IFunnelService {
    initClient(client?: APIClient)
    all(): Promise<any[]>
    one(funnelId: string): Promise<any>
    save(funnel: IFunnel): Promise<any>
    delete(funnelId: string): Promise<any>

    fetchInsights(funnelId: string, payload: any): Promise<any>
    fetchIssues(funnelId: string, payload: any): Promise<any>
    fetchIssue(funnelId: string, issueId: string): Promise<any>
}

export default class FunnelService implements IFunnelService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    all(): Promise<any[]> {
        return this.client.get('/funnels')
            .then(response => response.json())
            .then(response => response.data || []);
    }

    one(funnelId: string): Promise<any> {
        return this.client.get(`/funnels/${funnelId}`)
            .then(response => response.json())
    }

    save(funnel: IFunnel): Promise<any> {
        return this.client.post('/funnels', funnel)
            .then(response => response.json())
    }

    delete(funnelId: string): Promise<any> {
        return this.client.delete(`/funnels/${funnelId}`)
            .then(response => response.json())
    }

    fetchInsights(funnelId: string, payload: any): Promise<any> {
        return this.client.post(`/funnels/${funnelId}/insights`, payload)
            .then(response => response.json())
    }

    fetchIssues(funnelId: string, payload: any): Promise<any> {
        return this.client.post(`/funnels/${funnelId}/issues`, payload)
            .then(response => response.json())
    }

    fetchIssue(funnelId: string, issueId: string): Promise<any> {
        return this.client.get(`/funnels/${funnelId}/issues/${issueId}`)
            .then(response => response.json())
    }
}