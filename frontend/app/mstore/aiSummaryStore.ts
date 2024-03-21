import { aiService } from 'App/services';
import { makeAutoObservable } from 'mobx';

export default class AiSummaryStore {
  text = '';
  toggleSummary = false;

  constructor() {
    makeAutoObservable(this);
  }

  setText(text: string) {
    this.text = text;
  }

  setToggleSummary(toggleSummary: boolean) {
    this.toggleSummary = toggleSummary;
  }

  getSummary = async (sessionId: string) => {
    this.setText('');
    try {
      const respText = await aiService.getSummary(sessionId);
      if (!respText) return;

      this.setText(respText);
    } catch (e) {
      console.error(e);
    }
  };
}
