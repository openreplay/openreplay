import ListWalker from '../../common/ListWalker';
import type { TabChange } from '../messages';

export default class ActiveTabManager extends ListWalker<TabChange> {
  currentTime = 0;

  tabInstances: Set<string> = new Set();

  /** @returns tab id of the tab change passed while moving, or null if none */
  moveReady(t: number): string | null {
    if (t < this.currentTime) {
      this.reset();
    }
    this.currentTime = t;
    const msg = this.moveGetLast(t);

    if (msg) {
      this.tabInstances = new Set(this.listNow.map((m) => m.tabId));
      return msg.tabId;
    }
    return null;
  }
}
