import App from "../app/index.js";
import { SetViewportScroll, SetNodeScroll } from "../../messages/index.js";

export default function (app: App): void {
  let documentScroll = false;
  const nodeScroll: Map<Element, [number, number]> = new Map();

  const sendSetViewportScroll = app.safe((): void =>
    app.send(new 
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

  const sendSetNodeScroll = app.safe((s, node): void => {
    const id = app.nodes.getID(node);
    if (id !== undefined) {
      app.send(new SetNodeScroll(id, s[0], s[1]));
    }
  });

  app.attachStartCallback(sendSetViewportScroll);

  app.attachStopCallback(() => {
    documentScroll = false;
    nodeScroll.clear();
  });

  app.attachEventListener(window, 'scroll', (e: Event): void => {
    const target = e.target;
    if (target === document) {
      documentScroll = true;
      return;
    }
    if (target instanceof Element) {
      {
        nodeScroll.set(target, [target.scrollLeft, target.scrollTop]);
      }
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
