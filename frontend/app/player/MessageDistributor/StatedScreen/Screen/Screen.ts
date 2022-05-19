import Marker from './Marker';
import Cursor from './Cursor';
import Inspector from './Inspector'; 
// import styles from './screen.module.css';
// import { getState } from '../../../store';
import BaseScreen from './BaseScreen';

export { INITIAL_STATE } from './BaseScreen';
export type { State } from './BaseScreen';

export default class Screen extends BaseScreen {
  public readonly cursor: Cursor;
  private substitutor: BaseScreen | null = null;
  private inspector: Inspector | null = null;
  private marker: Marker | null = null;
  constructor() {
    super();
    this.cursor = new Cursor(this.overlay);
  }

  getCursorTarget() {
    return this.getElementFromInternalPoint(this.cursor.getPosition());
  }

  getCursorTargets() {
    return this.getElementsFromInternalPoint(this.cursor.getPosition());
  }

  _scale() {
    super._scale();
    if (this.substitutor) {
      this.substitutor._scale();
    }
  }

  enableInspector(clickCallback: ({ target: Element }) => void): Document | null {
    if (!this.parentElement) return null;
    if (!this.substitutor) {
      this.substitutor = new Screen();
      this.marker = new Marker(this.substitutor.overlay, this.substitutor);
      this.inspector = new Inspector(this.substitutor, this.marker);
      //this.inspector.addClickListener(clickCallback, true);
      this.substitutor.attach(this.parentElement);          
    }

    this.substitutor.display(false);
   
    const docElement = this.document?.documentElement; // this.substitutor.document?.importNode(
    const doc = this.substitutor.document;
    if (doc && docElement) {
      // doc.documentElement.innerHTML = "";
      // // Better way?
      // for (let i = 1; i < docElement.attributes.length; i++) {
      //   const att = docElement.attributes[i];
      //   doc.documentElement.setAttribute(att.name, att.value);
      // }
      // for (let i = 1; i < docElement.childNodes.length; i++) {
      //   doc.documentElement.appendChild(docElement.childNodes[i].cloneNode(true));
      // }
      doc.open();
      doc.write(docElement.outerHTML); // Context will be iframe, so instanceof Element won't work
      doc.close();

      // TODO! : copy stylesheets, check with styles
    }
    this.display(false);
    this.inspector.toggle(true, clickCallback);
    this.substitutor.display(true);
    return doc;
  }
  
  disableInspector() {
    if (this.substitutor) {
      const doc = this.substitutor.document;
      if (doc) { 
        doc.documentElement.innerHTML = "";
      }
      this.inspector.toggle(false);
      this.substitutor.display(false);
    }
    this.display(true);
  }

}