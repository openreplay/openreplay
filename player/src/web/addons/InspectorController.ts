import type { Store } from '../../index';
import Marker from '../Screen/Marker';
import Inspector from '../Screen/Inspector';
import Screen, { ScaleMode } from '../Screen/Screen';

export default class InspectorController {
  static INITIAL_STATE = {
    tagSelector: '',
  };

  private substitutor: Screen | null = null;

  private inspector: Inspector | null = null;

  marker: Marker | null = null;

  constructor(
    private screen: Screen,
    private readonly store: Store<{ tagSelector: string }>,
  ) {
    screen.overlay.addEventListener('contextmenu', () => {
      screen.overlay.style.display = 'none';
      // the replay iframe ignores pointer events; they reach the player doc
      const doc = screen.overlay.ownerDocument;
      const returnOverlay = () => {
        screen.overlay.style.display = 'block';
        doc.removeEventListener('mousemove', returnOverlay);
        doc.removeEventListener('mousedown', returnOverlay); // TODO: prevent default in case of input selection
      };
      doc.addEventListener('mousemove', returnOverlay);
      doc.addEventListener('mousedown', returnOverlay);
    });
  }

  enableInspector(): Document | null {
    this.marker?.clean();
    this.marker = new Marker(this.screen.overlay, this.screen);
    this.inspector = new Inspector(this.screen, this.marker);
    this.inspector.addClickListener(() => {
      const selector = this.marker?.computeSelector() ?? '';
      this.store.update({ tagSelector: selector });
    });

    this.inspector?.enable();
    return this.screen.document;
  }

  /** Outlines an element, picking or not (a feature row points at its own). */
  markBySelector(selector: string) {
    if (!this.marker && selector) {
      this.marker = new Marker(this.screen.overlay, this.screen, false);
    }
    this.marker?.markBySelector(selector);
  }

  disableInspector() {
    this.inspector?.clean();
    this.inspector = null;
    this.marker?.clean();
    this.marker = null;
  }
}
