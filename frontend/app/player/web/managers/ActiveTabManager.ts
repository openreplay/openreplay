import ListWalker from '../../common/ListWalker';
import type { TabChange } from '../messages';

export default class ActiveTabManager extends ListWalker<TabChange> {
  currentTime = 0;
  tabInstances: Set<string> = new Set();

  moveReady(t: number): Promise<string | null> {
    if (t < this.currentTime) {
      this.reset()
    }
    this.currentTime = t
    const msg = this.moveGetLast(t)

    if (msg) {
      const ids = this.listNow.map(m => m.tabId);
      this.tabInstances = new Set(ids)
      return Promise.resolve(msg.tabId)
    } else {
      return Promise.resolve(null);
    }
  }
}
