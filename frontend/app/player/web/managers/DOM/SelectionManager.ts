import Screen from 'Player/web/Screen/Screen';
import type { SelectionChange } from '../../messages';
import type { VElement } from './VirtualDOM';
import ListWalker from '../../../common/ListWalker';

export default class SelectionManager extends ListWalker<SelectionChange> {
  constructor(
    private readonly vElements: Map<number, VElement>,
    private readonly screen: Screen,
  ) {
    super();
  }

  private selected: [
    { id: number; node: Element } | null,
    { id: number; node: Element } | null,
  ] = [null, null];
  private highlightRange: Element[] = [];

  public clearSelection = () => {
    if (this.selected[0] === null && this.selected[1] === null) return;

    this.screen.clearSelection();
    this.selected = [null, null];
    this.highlightRange = [];
  };

  move(t: number) {
    const msg = this.moveGetLast(t);
    if (!msg) {
      return;
    }

    // in theory: empty selection or selection removed
    if (msg.selectionStart <= 0) {
      this.clearSelection();
      return;
    }
    // preventing clones
    if (
      this.selected[0] &&
      this.selected[0].id === msg.selectionStart &&
      this.selected[1] &&
      this.selected[1].id === msg.selectionEnd
    )
      return;

    const startVNode = this.vElements.get(msg.selectionStart - 1);
    const endVNode = this.vElements.get(msg.selectionEnd - 1);

    // only one selection present on page at the same time
    if (this.selected[0] && this.selected[0]?.id !== msg.selectionStart)
      this.clearSelection();

    if (startVNode && endVNode && this.screen.document) {
      const range = this.screen.document.createRange();
      range.setStartBefore(startVNode.node);
      range.setEndAfter(endVNode.node);

      for (const el of this.highlightRange) el.remove();
      this.highlightRange = [];
      const takenRanges: { start: number; end: number }[] = [];
      const rects = range.getClientRects();
      const rectLength = rects.length;
      for (let i = 0; i < rectLength; i += 1) {
        const r = rects[i];
        const insideRange = takenRanges.some((range) => {
          return range.start <= r.left && range.end >= r.left + r.width;
        });
        if (!insideRange) {
          takenRanges.push({
            start: r.left,
            end: r.left + r.width,
          });
          const hl = document.createElement('div');

          const left = `${r.left + window.scrollX}px`;
          const width = `${r.width}px`;
          const top = `${r.top + window.scrollY - 3}px`;
          const height = `${r.height + 6}px`;

          Object.assign(hl.style, {
            position: 'absolute',
            top,
            left,
            width,
            height,
            background: 'rgba(173, 216, 230, 0.45)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: '100',
          } as CSSStyleDeclaration);
          this.highlightRange.push(hl);
        }
      }
      const hlRangeLength = this.highlightRange.length;
      this.highlightRange.forEach((el: HTMLDivElement, i) => {
        const isStart = i === 0;
        const isEnd = i === hlRangeLength - 1;
        const elLeft = parseFloat(el.style.left);
        const elWidth = parseFloat(el.style.width);
        Object.assign(el.style, {
          borderTopLeftRadius: isStart ? '6px' : '0px',
          borderBottomLeftRadius: isStart ? '6px' : '0px',
          borderTopRightRadius: isEnd ? '6px' : '0px',
          borderBottomRightRadius: isEnd ? '6px' : '0px',
          left: isStart ? `${elLeft - 6}px` : el.style.left,
          width: isStart || isEnd ? `${elWidth + 6}px` : el.style.width,
        });
      });
      this.screen.createSelection(this.highlightRange);

      this.selected = [
        { id: msg.selectionStart, node: startVNode.node },
        { id: msg.selectionEnd, node: endVNode.node },
      ];
    }
  }
}
