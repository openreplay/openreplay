import ListWalker from '../../common/ListWalker';

export default class TabClosingManager extends ListWalker<{ tabId: string, time: number }> {
  currentTime = 0;
  closedTabs: Set<string> = new Set();

  moveReady(t: number): Promise<string | null> {
    if (t < this.currentTime) {
      this.reset()
    }
    this.currentTime = t
    const msg = this.moveGetLast(t)
    
    if (msg) {
      const ids = this.listNow.map(m => m.tabId);
      this.closedTabs = new Set(ids)
      return Promise.resolve(msg.tabId)
    } else {
      return Promise.resolve(null);
    }
  }
}
