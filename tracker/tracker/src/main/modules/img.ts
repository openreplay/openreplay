import type App from "../app/index.js";
import { timestamp, isURL } from "../utils.js";
import { ResourceTiming, SetNodeAttributeURLBased, SetNodeAttribute } from "../../common/messages.js";
import { hasTag } from "../app/guards.js";

function resolveURL(url: string, location: Location = document.location) {
  url = url.trim()
  if  (url.startsWith('/')) {
    return location.origin + url
  } else if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') // any other possible value here?
   ){
    return url
  } else {
   return location.origin + location.pathname + url
  }
}

const PLACEHOLDER_SRC = "https://static.openreplay.com/tracker/placeholder.jpeg";

export default function (app: App): void {
  function sendPlaceholder(id: number, node: HTMLImageElement): void {
    app.send(new SetNodeAttribute(id, "src", PLACEHOLDER_SRC))
    const { width, height } = node.getBoundingClientRect();
    if (!node.hasAttribute("width")){
      app.send(new SetNodeAttribute(id, "width", String(width)))
    }
    if (!node.hasAttribute("height")){
      app.send(new SetNodeAttribute(id, "height", String(height)))
    }
  }

  const sendImgSrc = app.safe(function (this: HTMLImageElement): void {
    const id = app.nodes.getID(this);
    if (id === undefined) {
      return;
    }
    const { src, complete, naturalWidth, naturalHeight, srcset } = this;
    if (!complete) {
      return;
    }
    const resolvedSrc = resolveURL(src || '') // Src type is null sometimes. - is it true?
    if (naturalWidth === 0 && naturalHeight === 0) {
      if (isURL(resolvedSrc)) {
        app.send(new ResourceTiming(timestamp(), 0, 0, 0, 0, 0, resolvedSrc, 'img'));
      }
    } else if (resolvedSrc.length >= 1e5 || app.sanitizer.isMasked(id)) {
      sendPlaceholder(id, this)
    } else {
      app.send(new SetNodeAttribute(id, 'src', resolvedSrc))
      if (srcset) {
        const resolvedSrcset = srcset.split(',').map(str => resolveURL(str)).join(',')
        app.send(new SetNodeAttribute(id, 'srcset', resolvedSrcset))
      }
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        const target = (mutation.target as HTMLImageElement);
        const id = app.nodes.getID(target);
        if (id === undefined) {
          return;
        }
        if (mutation.attributeName === "src") {
          const src = target.src;
          app.send(new SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()));
        }
        if (mutation.attributeName === "srcset") {
          const srcset = target.srcset;
          app.send(new SetNodeAttribute(id, 'srcset', srcset));
        }
      }
    }
  });

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, "IMG")) {
      return;
    }
    app.nodes.attachElementListener('error', node, sendImgSrc);
    app.nodes.attachElementListener('load', node, sendImgSrc);
    sendImgSrc.call(node);
    observer.observe(node, { attributes: true, attributeFilter: [ "src", "srcset" ] });
  });
}
