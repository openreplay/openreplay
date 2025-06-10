import APIClient, { clean as cleanParams } from 'App/api_client';
import { ISession } from 'Types/session/session';
import { IErrorStack } from 'Types/session/errorStack';

export default class SettingsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  saveCaptureRate(projectId: number, data: any) {
    return this.client.post(`/${projectId}/sample_rate`, data);
  }

  fetchCaptureRate(projectId: number) {
    return this.client
      .get(`/${projectId}/sample_rate`)
      .then((response) => response.json())
      .then((response) => response.data || 0);
  }

  fetchCaptureConditions(
    projectId: number,
  ): Promise<{ rate: number; conditionalCapture: boolean; conditions: any[] }> {
    return this.client
      .get(`/${projectId}/conditions`)
      .then((response) => response.json())
      .then((response) => response.data || []);
  }

  saveCaptureConditions(projectId: number, data: any) {
    return this.client.post(`/${projectId}/conditions`, data);
  }

  getSessions(filter: any): Promise<{ sessions: ISession[]; total: number }> {
    return this.client
      .post('/sessions/search', filter)
      .then((r) => r.json())
      .then((response) => response.data || [])
      .catch((e) => Promise.reject(e));
  }

  getFirstMobUrl(
    sessionId: string,
  ): Promise<{ domURL: string[]; fileKey?: string }> {
    return this.client
      .get(`/sessions/${sessionId}/first-mob`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(console.error);
  }

  getRecommendedSessions(sort?: any): Promise<{
    sessions: ISession[];
    total: number;
  }> {
    return this.client
      .post('/sessions-recommendations', sort)
      .then((r) => r.json())
      .then((response) => response || [])
      .catch((e) => Promise.reject(e));
  }

  getFinetuneSessions(): Promise<{ sessions: string[] }> {
    return this.client
      .get('/PROJECT_ID/finetuning/sessions')
      .then((r) => r.json())
      .catch(Promise.reject);
  }

  sendFeedback(data: any): Promise<any> {
    return this.client
      .post(`/session-feedback`, data)
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(Promise.reject);
  }

  signalFinetune() {
    return this.client.get('/PROJECT_ID/finetune');
  }

  checkFeedback(sessionId: string): Promise<any> {
    return this.client
      .get(`/session-feedback/${sessionId}`)
      .then((r) => r.json())
      .then((j) => j.data || false)
      .catch(Promise.reject);
  }

  getSessionInfo(sessionId: string, isLive?: boolean): Promise<ISession> {
    return this.client
      .get(
        isLive
          ? `/assist/sessions/${sessionId}`
          : `/sessions/${sessionId}/replay`,
      )
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(console.error);
  }

  getSessionEvents = async (sessionId: string) =>
    this.client
      .get(`/sessions/${sessionId}/events`)
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(console.error);

  getLiveSessions(filter: any): Promise<{ sessions: ISession[] }> {
    return this.client
      .post('/assist/sessions', cleanParams(filter))
      .then((r) => r.json())
      .then((response) => response.data || [])
      .catch((e) => Promise.reject(e));
  }

  getErrorStack(
    sessionId: string,
    errorId: string,
  ): Promise<{ trace: IErrorStack[] }> {
    return this.client
      .get(`/sessions/${sessionId}/errors/${errorId}/sourcemaps`)
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch((e) => Promise.reject(e));
  }

  getAutoplayList(params = {}): Promise<{ sessionId: string }[]> {
    return this.client
      .post('/sessions/search/ids', cleanParams(params))
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch((e) => Promise.reject(e));
  }

  toggleFavorite(sessionId: string): Promise<any> {
    return this.client
      .get(`/sessions/${sessionId}/favorite`)
      .catch(Promise.reject);
  }

  getClickMap(params = {}): Promise<any[]> {
    return this.client
      .post('/heatmaps/url', params)
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(Promise.reject);
  }

  getSessionClickMap(sessionId: string, params = {}): Promise<any[]> {
    return this.client
      .post(`/sessions/${sessionId}/clickmaps`, params)
      .then((r) => r.json())
      .then((j) => j.data || [])
      .catch(Promise.reject);
  }

  getRecordingStatus(): Promise<any> {
    return this.client
      .get('/check-recording-status')
      .then((r) => r.json())
      .then((j) => j.data || {})
      .catch(Promise.reject);
  }

  async fetchSimilarSessions(
    sessionId: string,
    params: any,
  ): Promise<{ sessions: ISession[] }> {
    try {
      const r = await this.client.post(
        `/PROJECT_ID/similar-sessions/${sessionId}`,
        params,
      );
      const j = await r.json();
      return j.sessions || [];
    } catch (reason) {
      return Promise.reject(reason);
    }
  }

  async getAssistCredentials(): Promise<any> {
    try {
      const r = await this.client.get('/config/assist/credentials');
      const j = await r.json();
      return j.data || null;
    } catch (reason) {
      return Promise.reject(reason);
    }
  }

  generateShorts(projectId: string) {
    try {
      void this.client.post(`/${projectId}/generate/shorts`, {});
    } catch (reason) {
      console.error('Error generating shorts:', reason);
    }
  }

  async fetchSessionClips(): Promise<{ clips: any[] }> {
    try {
      const r = await this.client.get('/PROJECT_ID/shorts-recommendations', {
        sortBy: 'startTs',
        sortOrder: 'desc',
      });
      // .get('/PROJECT_ID/shorts-recommendations');
      const j = await r.json();
      return j || {};
    } catch (reason) {
      return Promise.reject(reason);
    }
  }
}
