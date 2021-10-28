import { normSpaces, hasOpenreplayAttribute, getLabelAttribute } from '../utils';
import App from '../app';
import { MouseMove, MouseClick } from '../../messages';
import { getInputLabel } from './input';

function _getSelector(target: Element): string {
  let el: Element | null = target
  let selector: string | null = null
  do {
    if (el.id) {
      return `#${el.id}` + (selector ? ` > ${selector}` : '')
    }
    selector =
      el.className.split(' ')
        .map(cn => cn.trim())
        .filter(cn => cn !== '')
        .reduce((sel, cn) => `${sel}.${cn}`, el.tagName.toLowerCase()) + 
      (selector ?  ` > ${selector}` : '');
     if (el === document.body) {
       return selector
     }
     el = el.parentElement
  } while (el !== document.body && el !== null)
  return selector
}

//TODO: fix (typescript doesn't allow work when the guard is inside the function)
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
  // const options: Options = Object.assign(
  //   {},
  //   opts,
  // );

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

  const selectorMap: {[id:number]: string} = {};
  function getSelector(id: number, target: Element): string {
    return selectorMap[id] = selectorMap[id] || _getSelector(target);
  }

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
