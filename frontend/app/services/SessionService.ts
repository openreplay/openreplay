import APIClient from 'App/api_client';
import { ISession } from 'Types/session/session';
import { IErrorStack } from 'Types/session/errorStack';
import { clean as cleanParams } from 'App/api_client';

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

  getSessions(filter: any): Promise<{ sessions: ISession[], total: number }> {
    return this.client
      .post('/sessions/search', filter)
      .then(r => r.json())
      .then((response) => response.data || [])
      .catch(e => Promise.reject(e))
  }

  getSessionInfo(sessionId: string, isLive?: boolean): Promise<ISession> {
    return this.client
      .get(isLive ? `/assist/sessions/${sessionId}` : `/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(console.error);
  }

  getLiveSessions(filter: any): Promise<{ sessions: ISession[] }> {
    return this.client
      .post('/assist/sessions', cleanParams(filter))
      .then(r => r.json())
      .then((response) => response.data || [])
      .catch(e => Promise.reject(e))
  }

  getErrorStack(sessionId: string, errorId: string): Promise<{ trace: IErrorStack[] }> {
    return this.client
      .get(`/sessions/${sessionId}/errors/${errorId}/sourcemaps`)
      .then(r => r.json())
      .then(j => j.data || {})
      .catch(e => Promise.reject(e))
  }

  getAutoplayList(params = {}): Promise<{ sessionId: string}[]> {
    return this.client
      .post('/sessions/search/ids', cleanParams(params))
      .then(r => r.json())
      .then(j => j.data || [])
      .catch(e => Promise.reject(e))
  }
}
