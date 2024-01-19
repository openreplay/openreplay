import type Screen from './Screen'
import type Marker from './Marker'

export default class Inspector {
  constructor(private screen: Screen, private marker: Marker) {}

  private onMouseMove = (e: MouseEvent) => {
    e.stopPropagation();

    const target = this.screen.getElementFromPoint(e);
    if (target === this.marker.target) {
      return;
    }

    this.marker.mark(target);
  }

  private onOverlayLeave = () => {
    return this.marker.unmark();
  }

  private onMarkClick = () => {
    let target = this.marker.target;
    if (!target) {
      return
    }
    this.clickCallback && this.clickCallback({ target });
  }

  addClickListener(callback: (el: { target: Element }) => void) {
    this.clickCallback = callback
  }

  private clickCallback: (e: { target: Element }) => void = () => {}

  enable() {
    this.screen.overlay.addEventListener('mousemove', this.onMouseMove)
    this.screen.overlay.addEventListener('mouseleave', this.onOverlayLeave)
    this.screen.overlay.addEventListener('click', this.onMarkClick)
  }
  clean() {
    this.screen.overlay.removeEventListener('mousemove', this.onMouseMove)
    this.screen.overlay.removeEventListener('mouseleave', this.onOverlayLeave)
    this.screen.overlay.removeEventListener('click', this.onMarkClick)
  }
}
