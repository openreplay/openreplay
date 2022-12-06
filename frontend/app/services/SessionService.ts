import APIClient from 'App/api_client';
import { fetchErrorCheck } from 'App/utils';

export default class SettingsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client ? client : new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  saveCaptureRate(data: any) {
    return this.client.post('/sample_rate', data);
  }

  fetchCaptureRate() {
    return this.client
      .get('/sample_rate')
      .then((response) => response.json())
      .then((response) => response.data || 0);
  }

  getSessions(filter: any) {
    return this.client
      .post('/sessions/search', filter)
      .then(fetchErrorCheck)
      .then((response) => response.data || []);
  }

  getSessionInfo(sessionId: string, isLive?: boolean): Promise<Record<string, any>> {
    return this.client
      .get(isLive ? `/assist/sessions/${sessionId}` : `/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(console.error);
  }
}
