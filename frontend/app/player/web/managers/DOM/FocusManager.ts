import logger from 'App/logger';
import type { SetNodeFocus } from '../../messages';
import type { VElement } from './VirtualDOM';
import ListWalker from '../../../common/ListWalker';
import { FOCUS_CLASSNAME } from '../../messages/rewriter/constants';

export default class FocusManager extends ListWalker<SetNodeFocus> {
  constructor(private readonly vElements: Map<number, VElement>) {
    super();
  }

  private focused: Element | null = null;

  move(t: number) {
    const msg = this.moveGetLast(t);
    if (!msg) {
      return;
    }
    this.focused?.classList.remove(FOCUS_CLASSNAME);
    const oldParent = this.focused?.parentElement;
    if (
      oldParent &&
      oldParent.classList.contains(`${FOCUS_CLASSNAME}-within`)
    ) {
      oldParent.classList.remove(`${FOCUS_CLASSNAME}-within`);
    }
    if (msg.id === -1) {
      this.focused = null;
      return;
    }
    const vn = this.vElements.get(msg.id);
    if (!vn) {
      logger.error('Node not found', msg);
      return;
    }
    this.focused = vn.node;
    this.focused.classList.add(FOCUS_CLASSNAME);
    const currParent = this.focused.parentElement;
    if (currParent) {
      currParent.classList.add(`${FOCUS_CLASSNAME}-within`);
    }
  }
}
