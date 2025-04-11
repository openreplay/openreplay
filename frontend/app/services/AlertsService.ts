import APIClient from 'App/api_client';
import Alert, { IAlert } from 'Types/alert';

export default class AlertsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  save(instance: Alert): Promise<IAlert> {
    return this.client
      .post(
        instance.alertId ? `/alerts/${instance.alertId}` : '/alerts',
        instance.toData(),
      )
      .then((response) => response.json())
      .then((response) => response.data || {})
      .catch(Promise.reject);
  }

  fetchTriggerOptions(): Promise<{ name: string; value: string | number }[]> {
    return this.client
      .get('/alerts/triggers')
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(Promise.reject);
  }

  fetchList(): Promise<IAlert[]> {
    return this.client
      .get('/alerts')
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(Promise.reject);
  }

  fetch(id: string): Promise<IAlert> {
    return this.client
      .get(`/alerts/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(Promise.reject);
  }

  remove(id: string): Promise<IAlert> {
    return this.client
      .delete(`/alerts/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(Promise.reject);
  }
}
