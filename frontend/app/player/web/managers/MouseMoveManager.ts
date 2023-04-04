import type Screen from '../Screen/Screen'
import type { MouseMove } from "../messages";
import { HOVER_CLASSNAME } from '../messages/rewriter/constants'
import ListWalker from '../../common/ListWalker'


export default class MouseMoveManager extends ListWalker<MouseMove> {
	private hoverElements: Array<Element> = []

	constructor(private screen: Screen) {super()}

  private getCursorTargets() {
    return this.screen.getElementsFromInternalPoint(this.current)
  } 

	private updateHover(): void {
    const curHoverElements = this.getCursorTargets()
    const diffAdd = curHoverElements.filter(elem => !this.hoverElements.includes(elem))
    const diffRemove = this.hoverElements.filter(elem => !curHoverElements.includes(elem))
    this.hoverElements = curHoverElements
    diffAdd.forEach(elem => {
      elem.classList.add(HOVER_CLASSNAME)
    })
    diffRemove.forEach(elem => {
      elem.classList.remove(HOVER_CLASSNAME)
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
