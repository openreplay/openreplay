import type { SelectionChange } from '../../messages'
import type { VElement} from "./VirtualDOM";
import ListWalker from '../../../common/ListWalker';

const SELECTION_CLASS = { start: "-openreplay-selection-start", end: "-openreplay-selection-end" }


export default class SelectionManager extends ListWalker<SelectionChange> {
  constructor(private readonly vElements: Map<number, VElement>) {
    super();
  }

  private selected: [Element | null, Element | null] = [null, null]

  move(t: number) {
    const msg = this.moveGetLast(t)
    if (!msg) { return }
    console.log(msg)
    if (msg.selectionStart <= 0) {
      this.selected[0]?.classList.remove(SELECTION_CLASS.start)
      this.selected[0].style.border = 'unset'
      this.selected[1]?.classList.remove(SELECTION_CLASS.end)
      this.selected = [null, null]
      return;
    }
    const startVNode = this.vElements.get(msg.selectionStart -1)
    const endVNode = this.vElements.get(msg.selectionEnd -1)

    console.log(startVNode, endVNode, this.vElements)

    if (startVNode && endVNode) {
      this.selected = [startVNode.node, endVNode.node]

      this.selected[0]?.classList.add(SELECTION_CLASS.start)
      this.selected[0].style.border = '5px solid red'
      this.selected[1]?.classList.add(SELECTION_CLASS.end)
    }
  }
}