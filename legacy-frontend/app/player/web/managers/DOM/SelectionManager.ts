import type { SelectionChange } from '../../messages';
import type { VElement } from './VirtualDOM';
import ListWalker from '../../../common/ListWalker';
import Screen from 'Player/web/Screen/Screen';

export default class SelectionManager extends ListWalker<SelectionChange> {
  constructor(private readonly vElements: Map<number, VElement>, private readonly screen: Screen) {
    super();
  }

  private selected: [{ id: number, node: Element } | null, { id: number, node: Element } | null] = [null, null];

  public clearSelection = () => {
    if (this.selected[0] === null && this.selected[1] === null) return;

    this.screen.clearSelection()
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
    if ((this.selected[0] && this.selected[0].id === msg.selectionStart) && (this.selected[1] && this.selected[1].id === msg.selectionEnd)) return;

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
        left: (endCoords.left) + 'px',
        width: (endCoords.width) + 'px',
        height: endCoords.height + 'px',
        position: 'absolute',
        boxShadow: '1px 4px 1px -2px blue',
      });
      Object.assign(startPointer.style, {
        top: startCoords.top + 'px',
        left: (startCoords.left) + 'px',
        width: (startCoords.width) + 'px',
        height: startCoords.height + 'px',
        position: 'absolute',
        boxShadow: '1px 4px 1px -2px blue',
      });

      this.screen.createSelection(startPointer, endPointer);

      this.selected = [{ id: msg.selectionStart, node: startPointer }, { id: msg.selectionEnd, node: endPointer }];
    }
  }
}
