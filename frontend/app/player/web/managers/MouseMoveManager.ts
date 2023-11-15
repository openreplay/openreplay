import type Screen from '../Screen/Screen'
import type { MouseMove } from "../messages";
import { HOVER_CLASSNAME } from '../messages/rewriter/constants'
import ListWalker from '../../common/ListWalker'
import MouseTrail from '../addons/MouseTrail'
import styles from './trail.module.css'
import { MOUSE_TRAIL } from "App/constants/storageKeys";

export default class MouseMoveManager extends ListWalker<MouseMove> {
	private hoverElements: Array<Element> = []
  private mouseTrail: MouseTrail | undefined
  private readonly removeMouseTrail: boolean = false

	constructor(private screen: Screen) {
    super()
    const canvas = document.createElement('canvas')
    canvas.id = 'openreplay-mouse-trail'
    canvas.className = styles.canvas

    this.removeMouseTrail = localStorage.getItem(MOUSE_TRAIL) === 'false'
    if (!this.removeMouseTrail) {
      this.mouseTrail = new MouseTrail(canvas)
    }

    this.screen.overlay.appendChild(canvas)
    this.mouseTrail?.createContext()

    const updateSize = (w: number, h: number) => {
      return this.mouseTrail?.resizeCanvas(w, h)
    }

    this.screen.setOnUpdate(updateSize)
  }

  private getCursorTargets() {
    return this.screen.getElementsFromInternalPoint(this.current!)
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
      //window.getComputedStyle(this.screen.getCursorTarget()).cursor === 'pointer' // might influence performance though
      this.updateHover()
      this.mouseTrail?.leaveTrail(lastMouseMove.x, lastMouseMove.y)
    }
	}
}
