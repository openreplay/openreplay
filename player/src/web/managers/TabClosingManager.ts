import ListWalker from '../../common/ListWalker';

export default class TabClosingManager extends ListWalker<{
  tabId: string;
  time: number;
}> {
  currentTime = 0;

  closedTabs: Set<string> = new Set();

  /** @returns id of the last closed tab passed, 'reset' after a rewind, or null if nothing changed */
  moveReady(t: number): string | null {
    let didReset = false;
    if (t < this.currentTime) {
      this.reset();
      this.closedTabs = new Set();
      didReset = true;
    }
    this.currentTime = t;
    const msg = this.moveGetLast(t);

    if (msg) {
      this.closedTabs = new Set(this.listNow.map((m) => m.tabId));
      return msg.tabId;
    }
    return didReset ? 'reset' : null;
  }
}
