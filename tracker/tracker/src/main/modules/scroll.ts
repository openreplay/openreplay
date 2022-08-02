import type App from '../app/index.js';
import { SetViewportScroll, SetNodeScroll } from '../app/messages.js';
import { isElementNode } from '../app/guards.js';

export default function (app: App): void {
  let documentScroll = false;
  const nodeScroll: Map<Element, [number, number]> = new Map();

  const sendSetViewportScroll = app.safe((): void =>
    app.send(
      SetViewportScroll(
        window.pageXOffset ||
          (document.documentElement && document.documentElement.scrollLeft) ||
          (document.body && document.body.scrollLeft) ||
          0,
        window.pageYOffset ||
          (document.documentElement && document.documentElement.scrollTop) ||
          (document.body && document.body.scrollTop) ||
          0,
      ),
    ),
  );

  const sendSetNodeScroll = app.safe((s: [number, number], node: Node): void => {
    const id = app.nodes.getID(node);
    if (id !== undefined) {
      app.send(SetNodeScroll(id, s[0], s[1]));
    }
  });

  app.attachStartCallback(sendSetViewportScroll);

  app.attachStopCallback(() => {
    documentScroll = false;
    nodeScroll.clear();
  });

  app.nodes.attachNodeCallback((node, isStart) => {
    if (isStart && isElementNode(node) && node.scrollLeft + node.scrollTop > 0) {
      nodeScroll.set(node, [node.scrollLeft, node.scrollTop]);
    }
  });

  app.attachEventListener(window, 'scroll', (e: Event): void => {
    const target = e.target;
    if (target === document) {
      documentScroll = true;
      return;
    }
    if (target instanceof Element) {
      nodeScroll.set(target, [target.scrollLeft, target.scrollTop]);
    }
  });

  app.ticker.attach(
    (): void => {
      if (documentScroll) {
        sendSetViewportScroll();
        documentScroll = false;
      }
      nodeScroll.forEach(sendSetNodeScroll);
      nodeScroll.clear();
    },
    5,
    false,
  );
}
