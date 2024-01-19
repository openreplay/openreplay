import type { Store } from 'Player';
import { State } from 'Player/web/addons/TargetMarker';
import Marker from '../Screen/Marker';
import Inspector from '../Screen/Inspector';
import Screen, { ScaleMode } from '../Screen/Screen';
import type { Dimensions } from '../Screen/types';

export default class InspectorController {
  static INITIAL_STATE = {
    tagSelector: '',
  }
  private substitutor: Screen | null = null;
  private inspector: Inspector | null = null;
  marker: Marker | null = null;

  constructor(private screen: Screen, private readonly store: Store<{ tagSelector: string }>) {
    screen.overlay.addEventListener('contextmenu', () => {
      screen.overlay.style.display = 'none';
      const doc = screen.document;
      if (!doc) {
        return;
      }
      const returnOverlay = () => {
        screen.overlay.style.display = 'block';
        doc.removeEventListener('mousemove', returnOverlay);
        doc.removeEventListener('mouseclick', returnOverlay); // TODO: prevent default in case of input selection
      };
      doc.addEventListener('mousemove', returnOverlay);
      doc.addEventListener('mouseclick', returnOverlay);
    });
  }

  scale(dims: Dimensions) {
    this.screen.scale(dims);
  }

  enableInspector(): Document | null {
    this.marker = new Marker(this.screen.overlay, this.screen);
    this.inspector = new Inspector(this.screen, this.marker);
    this.inspector.addClickListener(() => {
      this.store.update({ tagSelector: this.marker?.lastSelector ?? '' })
    });

    this.inspector?.enable();
    return this.screen.document;
  }

  markBySelector(selector: string) {
    this.marker?.markBySelector(selector);
  }

  disableInspector() {
    this.inspector?.clean();
    this.inspector = null;
    this.marker?.clean();
    this.marker = null;
  }
}
