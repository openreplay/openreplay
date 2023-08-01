import ListWalker from '../../common/ListWalker';
import type { TabChange, TabClosed } from '../messages';

type TabEvent = TabChange | TabClosed

export default class ActiveTabManager extends ListWalker<TabEvent> {
  currentTime = 0;
  tabInstances: Set<string> = new Set();
  closedTabs: string[] = [];

  moveReady(t: number): Promise<TabEvent | null> {
    if (t < this.currentTime) {
      this.reset()
    }
    this.currentTime = t
    const msg = this.moveGetLast(t)

    if (msg) {
      const ids = this.listNow.filter(m => m.tp === 117).map(m => m.tabId);
      const closedIds = this.listNow.filter(m => m.tp === 119).map(m => m.tabId);
      this.tabInstances = new Set(ids)
      this.closedTabs = closedIds

      return Promise.resolve(msg)
    } else {
      return Promise.resolve(null);
    }
  }
}
