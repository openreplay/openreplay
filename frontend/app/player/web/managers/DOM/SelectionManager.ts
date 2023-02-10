import type { SelectionChange } from '../../messages';
import type { VElement } from './VirtualDOM';
import ListWalker from '../../../common/ListWalker';
import Screen from 'Player/web/Screen/Screen';

export default class SelectionManager extends ListWalker<SelectionChange> {
  constructor(private readonly vElements: Map<number, VElement>, private readonly screen: Screen) {
    super();
  }

  private selected: [{ id: number, node: Element } | null, { id: number, node: Element } | null] = [null, null];

  clearSelection() {
    this.selected[0] && this.screen.overlay.removeChild(this.selected[0].node) && this.selected[0].node.remove();
    this.selected[1] && this.screen.overlay.removeChild(this.selected[1].node) && this.selected[1].node.remove();
    this.selected = [null, null];
  }

  move(t: number) {
    const msg = this.moveGetLast(t);
    if (!msg) {
      return;
    }
    // in theory: empty selection or selection removed
    if (msg.selectionStart <= 0) {
      this.clearSelection()
      return;
    }
    // preventing clones
    if (this.selected[0] && this.selected[0].id === msg.selectionStart) return;

    const startVNode = this.vElements.get(msg.selectionStart - 1);
    const endVNode = this.vElements.get(msg.selectionEnd - 1);

    // only one selection present on page at the same time
    if (this.selected[0] && this.selected[0]?.id !== msg.selectionStart) this.clearSelection()

    if (startVNode && endVNode) {
      const startCoords = startVNode.node.getBoundingClientRect();
      const endCoords = endVNode.node.getBoundingClientRect();

      const startPointer = document.createElement('div');
      const endPointer = document.createElement('div');

      Object.assign(endPointer.style, {
        top: endCoords.top + 'px',
        left: (endCoords.left + endCoords.width + 3) + 'px',
        width: '3px',
        height: endCoords.height + 'px',
        border: '3px solid red',
        position: 'absolute',
      });
      Object.assign(startPointer.style, {
        top: startCoords.top + 'px',
        left: (startCoords.left - 3) + 'px',
        width: '3px',
        height: startCoords.height + 'px',
        border: '3px solid red',
        position: 'absolute',
      });

      this.screen.overlay.appendChild(startPointer);
      this.screen.overlay.appendChild(endPointer);

      this.selected = [{ id: msg.selectionStart, node: startPointer }, { id: msg.selectionEnd, node: endPointer }];
    }
  }
}
