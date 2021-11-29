import { timestamp, isURL } from "../utils.js";
import App from "../app/index.js";
import { ResourceTiming, SetNodeAttributeURLBased } from "../../messages/index.js";

export default function (app: App): void {
  const sendImgSrc = app.safe(function (this: HTMLImageElement): void {
    const id = app.nodes.getID(this);
    if (id === undefined) {
      return;
    }
    const { src, complete, naturalWidth, naturalHeight } = this;
    if (!complete) {
      return;
    }
    if (naturalWidth === 0 && naturalHeight === 0) {
      if (src != null && isURL(src)) { // TODO: How about relative urls ? Src type is null sometimes.
        app.send(new ResourceTiming(timestamp(), 0, 0, 0, 0, 0, src, 'img'));
      }
    } else if (src.length < 1e5) {
      app.send(new SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()));
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "src") {
        const target = (mutation.target as HTMLImageElement);
        const id = app.nodes.getID(target);
        if (id === undefined) {
          return;
        }
        const src = target.src;
        app.send(new SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()));
      }
    }
  });

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!(node instanceof HTMLImageElement)) {
      return;
    }
    app.nodes.attachElementListener('error', node, sendImgSrc);
    app.nodes.attachElementListener('load', node, sendImgSrc);
    sendImgSrc.call(node);
    observer.observe(node, { attributes: true });
  });
}
