import ListWalker from '../../common/ListWalker';
import type { TabChange } from '../messages';

export default class ActiveTabManager extends ListWalker<TabChange> {
  currentTime = 0;

  moveReady(t: number): Promise<string | null> {

    if (t < this.currentTime) {
      this.reset()
    }
    this.currentTime = t
    const msg = this.moveGetLastDebug(t)
    console.log('move', t, msg, this.list)

    return Promise.resolve(msg?.tabId || null)
  }
}