import Marker from '../Screen/Marker'
import Inspector from '../Screen/Inspector'
import Screen from '../Screen/Screen'
import type { Dimensions } from '../Screen/types'


export default class InspectorController {
  private substitutor: Screen | null = null
  private inspector: Inspector | null = null
  marker: Marker | null = null
  constructor(private screen: Screen) {
      screen.overlay.addEventListener('contextmenu', () => {
        screen.overlay.style.display = 'none'
        const doc = screen.document
        if (!doc) { return }
        const returnOverlay = () => {
          screen.overlay.style.display = 'block'
          doc.removeEventListener('mousemove', returnOverlay)
          doc.removeEventListener('mouseclick', returnOverlay) // TODO: prevent default in case of input selection
        }
        doc.addEventListener('mousemove', returnOverlay)
        doc.addEventListener('mouseclick', returnOverlay)
      })
  }

  scale(dims: Dimensions) {
    if (this.substitutor) {
      this.substitutor.scale(dims)
    }
  }

  enableInspector(clickCallback?: (e: { target: Element }) => void): Document | null {
    const parent = this.screen.getParentElement()
    if (!parent) return null;
    if (!this.substitutor) {
      this.substitutor = new Screen()
      this.marker = new Marker(this.substitutor.overlay, this.substitutor)
      this.inspector = new Inspector(this.substitutor, this.marker)
      //this.inspector.addClickListener(clickCallback, true)
      this.substitutor.attach(parent)
    }

    this.substitutor.display(false)

    const docElement = this.screen.document?.documentElement // this.substitutor.document?.importNode(
    const doc = this.substitutor.document
    if (doc && docElement) {
      doc.open()
      doc.write(docElement.outerHTML)
      doc.close()

      // TODO! : copy stylesheets & cssRules?
    }
    this.screen.display(false);
    this.inspector.enable(clickCallback);
    this.substitutor.display(true);
    return doc;
  }

  disableInspector() {
    if (this.substitutor) {
      const doc = this.substitutor.document;
      if (doc) {
        doc.documentElement.innerHTML = "";
      }
      this.inspector.clean();
      this.substitutor.display(false);
    }
    this.screen.display(true);
  }

}
