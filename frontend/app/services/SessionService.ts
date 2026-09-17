import APIClient, { apiClient, clean as cleanParams } from 'App/api_client';
import { ISession } from 'Types/session/session';
import { IErrorStack } from 'Types/session/errorStack';

export default class SettingsService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || apiClient;
  }

  initClient(client?: APIClient) {
    this.client = client || apiClient;
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

  getSessions(
    filter: any,
    abortSignal?: AbortSignal,
  ): Promise<{ sessions: ISession[]; total: number }> {
    return this.client
      .post('/sessions/search', filter, undefined, undefined, abortSignal)
      .then((r) => r.json())
      .then((response) => response.data || []);
  }

  getFirstMobUrl(
    sessionId: string,
  ): Promise<{ domURL: string[]; fileKey?: string }> {
    return this.client
      .get(`/sessions/${sessionId}/first-mob`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  getRecommendedSessions(sort?: any): Promise<{
    sessions: ISession[];
    total: number;
  }> {
    return this.client
      .post('/sessions-recommendations', sort)
      .then((r) => r.json())
      .then((response) => response || []);
  }

  getFinetuneSessions(): Promise<{ sessions: string[] }> {
    return this.client
      .get('/PROJECT_ID/finetuning/sessions')
      .then((r) => r.json());
  }

  sendFeedback(data: any): Promise<any> {
    return this.client
      .post(`/session-feedback`, data)
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  signalFinetune() {
    return this.client.get('/PROJECT_ID/finetune');
  }

  checkFeedback(sessionId: string): Promise<any> {
    return this.client
      .get(`/session-feedback/${sessionId}`)
      .then((r) => r.json())
      .then((j) => j.data || false);
  }

  getSessionInfo(
    sessionId: string,
    isLive?: boolean,
    abortSignal?: AbortSignal,
  ): Promise<ISession> {
    return this.client
      .get(
        isLive
          ? `/assist/sessions/${sessionId}`
          : `/sessions/${sessionId}/replay`,
        undefined,
        undefined,
        undefined,
        abortSignal,
      )
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  getSessionEvents = async (sessionId: string) =>
    this.client
      .get(`/sessions/${sessionId}/events`)
      .then((r) => r.json())
      .then((j) => j.data || []);

  getLiveSessions(filter: any): Promise<{ sessions: ISession[] }> {
    return this.client
      .post('/assist/sessions', cleanParams(filter))
      .then((r) => r.json())
      .then((response) => response.data || []);
  }

  getErrorStack(
    sessionId: string,
    errorId: string,
  ): Promise<{ trace: IErrorStack[] }> {
    return this.client
      .get(`/sessions/${sessionId}/errors/${errorId}/sourcemaps`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  getAutoplayList(params = {}): Promise<{ sessionId: string }[]> {
    return this.client
      .post('/sessions/search/ids', cleanParams(params))
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  toggleFavorite(sessionId: string): Promise<any> {
    return this.client
      .get(`/sessions/${sessionId}/favorite`);
  }

  getClickMap(params = {}): Promise<any[]> {
    return this.client
      .post('/heatmaps/url', params)
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  getSessionClickMap(sessionId: string, params = {}): Promise<any[]> {
    return this.client
      .post(`/sessions/${sessionId}/clickmaps`, params)
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  getRecordingStatus(): Promise<any> {
    return this.client
      .get('/check-recording-status')
      .then((r) => r.json())
      .then((j) => j.data || {});
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
