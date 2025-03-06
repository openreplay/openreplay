import { makeAutoObservable } from 'mobx';

import { aiService } from 'App/services';

export default class AiSummaryStore {
  text = '';

  toggleSummary = false;

  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setText(text: string) {
    this.text = text;
  }

  setToggleSummary(toggleSummary: boolean) {
    this.toggleSummary = toggleSummary;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  getSummary = async (sessionId: string) => {
    if (this.isLoading) return;

    this.setLoading(true);
    this.setText('');
    try {
      const respText = await aiService.getSummary(sessionId);
      if (!respText) return;

      this.setText(respText);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  getDetailedSummary = async (
    sessionId: string,
    networkEvents: any[],
    feat: 'errors' | 'issues' | 'journey',
    startTs: number,
    endTs: number,
  ) => {
    if (this.isLoading) return;

    this.setLoading(true);
    this.setText('');
    try {
      const respText = await aiService.getDetailedSummary(
        sessionId,
        networkEvents,
        feat,
        startTs,
        endTs,
      );
      if (!respText) return;

      this.setText(respText);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };
}
