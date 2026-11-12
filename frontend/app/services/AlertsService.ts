import Alert, { IAlert } from 'Types/alert';

import APIClient, { apiClient } from 'App/api_client';

export default class AlertsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || apiClient;
  }

  initClient(client?: APIClient) {
    this.client = client || apiClient;
  }

  save(instance: Alert): Promise<IAlert> {
    return this.client
      .post(
        instance.alertId ? `/alerts/${instance.alertId}` : '/alerts',
        instance.toData(),
      )
      .then((response) => response.json())
      .then((response) => response.data || {});
  }

  fetchTriggerOptions(): Promise<
    {
      name: string;
      value: string | number;
      unit?: string;
      source?: string;
      predefined?: boolean;
    }[]
  > {
    return this.client
      .get('/alerts/triggers')
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  fetchList(): Promise<IAlert[]> {
    return this.client
      .get('/alerts')
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  fetch(id: string): Promise<IAlert> {
    return this.client
      .get(`/alerts/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  remove(id: string): Promise<IAlert> {
    return this.client
      .delete(`/alerts/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }
}
