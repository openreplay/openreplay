import { select } from 'optimal-select';


export default  class Inspector {
  constructor(screen) {
    this.screen = screen;
  }

  _onMouseMove = (e) => {
    const { overlay, marker } = this.screen;
    if (e.target !== overlay) return marker.unmark();

    e.stopPropagation();
    const target = this.screen.getElementFromPoint(e);
    marker.mark(target);
  }

  _onMarkClick = () => {
    onTargetClick(select(markedTarget, { root: this.screen.document }));
  }

  toggle(flag) {
    if (flag) {
      this.screen.cursor.toggle(false);
      document.addEventListener('mousemove', this._onMouseMove);
      this.screen.overlay.addEventListener('click', this._onMarkClick);
    } else {
      this.screen.toggle(true);
      document.removeEventListener('mousemove', this._onMouseMove);
      this.screen.overlay.removeEventListener('click', this._onMarkClick);
    }
  }
}