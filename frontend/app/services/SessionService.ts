import { ISession } from 'Types/session/session';

import { clean as cleanParams } from 'App/api_client';

import BaseService from './BaseService';

export default class SettingsService extends BaseService {
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

  getAutoplayList(params = {}): Promise<{ sessionId: string }[]> {
    return this.client
      .post('/sessions/search/ids', cleanParams(params))
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  toggleFavorite(sessionId: string): Promise<any> {
    return this.client.get(`/sessions/${sessionId}/favorite`);
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

  async getAssistCredentials(): Promise<any> {
    try {
      const r = await this.client.get('/config/assist/credentials');
      const j = await r.json();
      return j.data || null;
    } catch (reason) {
      return Promise.reject(reason);
    }
  }
}
