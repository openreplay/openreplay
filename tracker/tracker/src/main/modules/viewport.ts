import App from "../app/index.js";
import {
  SetPageLocation,
  SetViewportSize,
  SetPageVisibility,
} from "../../messages/index.js";

export default function (app: App): void {
  let url: string, width: number, height: number;
  let navigationStart = performance.timing.navigationStart;

  const sendSetPageLocation = app.safe(() => {
    const { URL } = document;
    if (URL !== url) {
      url = URL;
      app.send(new SetPageLocation(url, document.referrer, navigationStart));
      navigationStart = 0;
    }
  });

  const sendSetViewportSize = app.safe(() => {
    const { innerWidth, innerHeight } = window;
    if (innerWidth !== width || innerHeight !== height) {
      width = innerWidth;
      height = innerHeight;
      app.send(new SetViewportSize(width, height));
    }
  });

  const sendSetPageVisibility =
    document.hidden === undefined
      ? Function.prototype
      : app.safe(() => app.send(new SetPageVisibility(document.hidden)));

  app.attachStartCallback(() => {
    url = '';
    width = height = -1;
    sendSetPageLocation();
    sendSetViewportSize();
    sendSetPageVisibility();
  });

  if (document.hidden !== undefined) {
    app.attachEventListener(
      document,
      'visibilitychange',
      sendSetPageVisibility as EventListener,
      false,
      false,
    );
  }

  app.ticker.attach(sendSetPageLocation, 1, false);
  app.ticker.attach(sendSetViewportSize, 5, false);
}
