import type StatedScreen from '../StatedScreen';
import type { MouseMove } from '../messages';
import type { Timed } from '../Timed';

import ListWalker from './ListWalker';

type MouseMoveTimed = MouseMove & Timed;

const HOVER_CLASS = "-openreplay-hover";
const HOVER_CLASS_DEPR = "-asayer-hover";

export default class MouseManager extends ListWalker<MouseMoveTimed> {
	private hoverElements: Array<Element> = [];

	constructor(private screen: StatedScreen) {super();}

	private updateHover(): void {
    // @ts-ignore TODO
    const curHoverElements = this.screen.getCursorTargets();
    const diffAdd = curHoverElements.filter(elem => !this.hoverElements.includes(elem));
    const diffRemove = this.hoverElements.filter(elem => !curHoverElements.includes(elem));
    this.hoverElements = curHoverElements;
    diffAdd.forEach(elem => {
      elem.classList.add(HOVER_CLASS)
      elem.classList.add(HOVER_CLASS_DEPR)
    });
    diffRemove.forEach(elem => {
      elem.classList.remove(HOVER_CLASS)
      elem.classList.remove(HOVER_CLASS_DEPR)
    });
  }

  reset(): void {
  	this.hoverElements = [];
  }

	move(t: number) {
		const lastMouseMove = this.moveToLast(t);
		if (!!lastMouseMove){
      // @ts-ignore TODO
      this.screen.cursor.move(lastMouseMove);
      this.updateHover();
    }
	}


}