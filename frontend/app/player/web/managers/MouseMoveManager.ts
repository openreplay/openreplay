import type Screen from '../Screen/Screen'
import type { MouseMove } from "../messages";

import ListWalker from '../../common/ListWalker'

const HOVER_CLASS = "-openreplay-hover";
const HOVER_CLASS_DEPR = "-asayer-hover";

export default class MouseMoveManager extends ListWalker<MouseMove> {
	private hoverElements: Array<Element> = []

	constructor(private screen: Screen) {super()}

  // private getCursorTarget() {
  //   return this.screen.getElementFromInternalPoint(this.current)
  // }

  private getCursorTargets() {
    return this.screen.getElementsFromInternalPoint(this.current)
  } 

	private updateHover(): void {
    const curHoverElements = this.getCursorTargets()
    const diffAdd = curHoverElements.filter(elem => !this.hoverElements.includes(elem))
    const diffRemove = this.hoverElements.filter(elem => !curHoverElements.includes(elem))
    this.hoverElements = curHoverElements
    diffAdd.forEach(elem => {
      elem.classList.add(HOVER_CLASS)
      elem.classList.add(HOVER_CLASS_DEPR)
    })
    diffRemove.forEach(elem => {
      elem.classList.remove(HOVER_CLASS)
      elem.classList.remove(HOVER_CLASS_DEPR)
    })
  }

  reset(): void {
  	this.hoverElements.length = 0
  }

	move(t: number) {
		const lastMouseMove = this.moveGetLast(t)
		if (!!lastMouseMove) {
      this.screen.cursor.move(lastMouseMove)
      //window.getComputedStyle(this.screen.getCursorTarget()).cursor === 'pointer' // might nfluence performance though
      this.updateHover()
    }
	}
}
