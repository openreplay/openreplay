import { finder } from '../vendors/finder/finder';
import { normSpaces, hasOpenreplayAttribute, getLabelAttribute } from '../utils';
import App from '../app';
import { MouseMove, MouseClick } from '../../messages';
import { getInputLabel } from './input';

const selectorMap: {[id:number]: string} = {};
function getSelector(id: number, target: Element): string {
  return selectorMap[id] = selectorMap[id] || finder(target);
}

function getTarget(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return _getTarget(target);
  }
  return null;
}

function _getTarget(target: Element): Element | null {
  let element: Element | null = target;
  while (element !== null && element !== document.documentElement) {
    if (hasOpenreplayAttribute(element, 'masked')) {
      return null;
    }
    element = element.parentElement;
  }
  if (target instanceof SVGElement) {
    let owner = target.ownerSVGElement;
    while (owner !== null) {
      target = owner;
      owner = owner.ownerSVGElement;
    }
  }
  element = target;
  while (element !== null && element !== document.documentElement) {
    const tag = element.tagName.toUpperCase();
    if (tag === 'LABEL') {
      return null;
    }
    if (tag === 'INPUT') {
      return element;
    }
    if (
      tag === 'BUTTON' ||
      tag === 'A' ||
      tag === 'LI' ||
      (element as HTMLElement).onclick != null ||
      element.getAttribute('role') === 'button' ||
      getLabelAttribute(element) !== null
    ) {
      return element;
    }
    element = element.parentElement;
  }
  return target === document.documentElement ? null : target;
}

function getTargetLabel(target: Element): string {
  const dl = getLabelAttribute(target);
  if (dl !== null) {
    return dl;
  }
  const tag = target.tagName.toUpperCase();
  if (tag === 'INPUT') {
    return getInputLabel(target as HTMLInputElement)
  }
  if (tag === 'BUTTON' ||
      tag === 'A' ||
      tag === 'LI' ||
      (target as HTMLElement).onclick != null ||
      target.getAttribute('role') === 'button'
    ) {
    const label: string = (target as HTMLElement).innerText || '';
    return normSpaces(label).slice(0, 100);
  }
  return '';
}

export default function (app: App): void {
  let mousePositionX = -1;
  let mousePositionY = -1;
  let mousePositionChanged = false;
  let mouseTarget: Element | null = null;
  let mouseTargetTime = 0;

  app.attachStopCallback(() => {
    mousePositionX = -1;
    mousePositionY = -1;
    mousePositionChanged = false;
    mouseTarget = null;
  });

  const sendMouseMove = (): void => {
    if (mousePositionChanged) {
      app.send(new MouseMove(mousePositionX, mousePositionY));
      mousePositionChanged = false;
    }
  };

  app.attachEventListener(
    <HTMLElement>document.documentElement,
    'mouseover',
    (e: MouseEvent): void => {
      const target = getTarget(e.target);
      if (target !== mouseTarget) {
        mouseTarget = target;
        mouseTargetTime = performance.now();
      }
    },
  );
  app.attachEventListener(
    document,
    'mousemove',
    (e: MouseEvent): void => {
      mousePositionX = e.clientX;
      mousePositionY = e.clientY;
      mousePositionChanged = true;
    },
    false,
  );
  app.attachEventListener(document, 'click', (e: MouseEvent): void => {
    const target = getTarget(e.target);
    if ((!e.clientX && !e.clientY) || target === null) {
      return;
    }
    const id = app.nodes.getID(target);
    if (id !== undefined) {
      sendMouseMove();
      app.send(new
        MouseClick(
          id,
          mouseTarget === target
            ? Math.round(performance.now() - mouseTargetTime)
            : 0,
          getTargetLabel(target),
          getSelector(id, target),
        ),
        true,
      );
    }
    mouseTarget = null;
  });

  app.ticker.attach(sendMouseMove, 10);
}
