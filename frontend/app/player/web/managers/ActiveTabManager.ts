import { ITabClosedMsg, TabClosedTp } from 'Player/web/MessageManager';
import ListWalker from '../../common/ListWalker';
import type { TabChange } from '../messages';
import { MType } from '../messages';

type TabEvent = TabChange | ITabClosedMsg;

export default class ActiveTabManager extends ListWalker<TabEvent> {
  currentTime = 0;
  tabInstances: Set<string> = new Set();
  closedTabs: string[] = [];

  moveReady(t: number): Promise<TabEvent | null> {
    if (t < this.currentTime) {
      this.reset();
    }
    this.currentTime = t;
    const msg = this.moveGetLast(t);

    if (msg) {
      const ids = this.listNow.filter((m) => m.tp === MType.TabChange).map((m) => m.tabId);
      const closedIds = this.listNow.filter((m) => m.tp === TabClosedTp).map((m) => m.tabId);
      this.tabInstances = new Set(ids);
      this.closedTabs = closedIds;

      return Promise.resolve(msg);
    } else {
      return Promise.resolve(null);
    }
  }
}
