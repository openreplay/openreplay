import { rulesText } from './pageCopy';

/**
 * A card's thumbnail: the frozen replay as markup, drawn by the browser in a
 * sandboxed frame. A picture of it would need its pixels, which the browser
 * withholds for cross-origin images and fonts the page uses.
 */
export interface PageSnapshot {
  html: string;
  /** The page's size, in replay pixels. */
  width: number;
  height: number;
  /** The replay's viewport, so vh units and media queries match. */
  frameWidth: number;
  frameHeight: number;
}

const MIME = 'application/vnd.openreplay.page+gzip';
// the page's size rides in the header, so a dashboard lays the card out
// without unpacking it: data:<mime>;w=1440;h=3000;base64,...
const HEAD =
  /^data:application\/vnd\.openreplay\.page\+gzip((?:;\w+=[\w.]+)*);base64,/;
// the API takes a card of up to 5 MB, the rest of it is small
const MAX_LENGTH = 4_500_000;
// nested frames go into srcdoc, each level escaped once more
const MAX_FRAME_DEPTH = 2;

type StyleRoot = (Document | ShadowRoot) & {
  adoptedStyleSheets?: CSSStyleSheet[];
};

function sheetsStyle(root: StyleRoot, target: Document) {
  const sheets = root.adoptedStyleSheets;
  if (!sheets?.length) return null;
  const style = target.createElement('style');
  style.textContent = sheets.map((s) => rulesText(s) ?? '').join('\n');
  return style;
}

function inlineElement(
  el: Element,
  copy: Element,
  target: Document,
  depth: number,
) {
  for (const { name } of Array.from(copy.attributes)) {
    if (name.startsWith('on')) copy.removeAttribute(name);
  }
  const shadow = el.shadowRoot;
  if (shadow) {
    // parsed back into a shadow root (declarative shadow DOM)
    const template = target.createElement('template');
    template.setAttribute('shadowrootmode', 'open');
    shadow.childNodes.forEach((n) =>
      template.content.appendChild(target.importNode(n, true)),
    );
    inlineTree(shadow, template.content, target, depth);
    const adopted = sheetsStyle(shadow, target);
    if (adopted) template.content.appendChild(adopted);
    copy.insertBefore(template, copy.firstChild);
  }
  switch (el.localName) {
    case 'style': {
      // the player inserts rules through CSSOM, which the markup doesn't carry
      const text = rulesText((el as HTMLStyleElement).sheet);
      if (text !== null) copy.textContent = text;
      break;
    }
    case 'script':
      copy.remove();
      break;
    case 'iframe': {
      copy.removeAttribute('src');
      copy.removeAttribute('srcdoc');
      let inner: Document | null = null;
      try {
        inner = (el as HTMLIFrameElement).contentDocument;
      } catch {}
      if (inner?.documentElement && depth < MAX_FRAME_DEPTH) {
        copy.setAttribute('srcdoc', serializePage(inner, depth + 1));
      }
      break;
    }
    case 'canvas':
      try {
        const url = (el as HTMLCanvasElement).toDataURL('image/webp', 0.8);
        (copy as HTMLElement).style.background =
          `url("${url}") 0 0 / 100% 100% no-repeat`;
      } catch {
        // drawn from a cross-origin image: stays blank
      }
      break;
    case 'input': {
      const input = el as HTMLInputElement;
      if (input.type === 'checkbox' || input.type === 'radio') {
        copy.toggleAttribute('checked', input.checked);
      } else {
        copy.setAttribute('value', input.value);
      }
      break;
    }
    case 'textarea':
      copy.textContent = (el as HTMLTextAreaElement).value;
      break;
    case 'option':
      copy.toggleAttribute('selected', (el as HTMLOptionElement).selected);
      break;
    case 'img':
      copy.removeAttribute('loading');
      break;
    case 'video':
    case 'audio':
      copy.removeAttribute('autoplay');
      copy.setAttribute('preload', 'none');
      break;
    case 'meta':
      copy.removeAttribute('http-equiv');
      break;
  }
}

function inlineTree(
  from: ParentNode,
  to: ParentNode,
  target: Document,
  depth: number,
) {
  const src = from.querySelectorAll('*');
  const dst = to.querySelectorAll('*');
  if (src.length !== dst.length) return;
  for (let i = 0; i < src.length; i++)
    inlineElement(src[i], dst[i], target, depth);
}

/**
 * The frozen replay as one HTML document, with what the player applied outside
 * the markup: CSSOM rules, adopted sheets, shadow roots, form state, frames.
 */
export function serializePage(source: Document, depth = 0): string {
  const target = document.implementation.createHTMLDocument('');
  const root = target.importNode(source.documentElement, true);
  inlineTree(source.documentElement, root, target, depth);
  const adopted = sheetsStyle(source, target);
  if (adopted) (root.querySelector('head') ?? root).appendChild(adopted);
  const doctype = source.compatMode === 'CSS1Compat' ? '<!doctype html>' : '';
  return doctype + root.outerHTML;
}

function toDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function pipe(
  stream: CompressionStream | DecompressionStream,
  input: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = stream.writable.getWriter();
  // a failure surfaces on the reading side
  writer.write(input).catch(() => {});
  writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export async function encodePageSnapshot(
  snapshot: PageSnapshot,
): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  const bytes = await pipe(new CompressionStream('gzip'), json);
  const url = await toDataURL(new Blob([bytes], { type: MIME }));
  return url.replace(
    ';base64,',
    `;w=${Math.round(snapshot.width)};h=${Math.round(snapshot.height)};base64,`,
  );
}

export function isPageSnapshot(thumbnail: string | undefined | null) {
  return !!thumbnail && HEAD.test(thumbnail);
}

/** The page's size, read from the thumbnail's header. */
export function pageSize(
  thumbnail: string | undefined | null,
): { width: number; height: number } | null {
  const params = thumbnail?.match(HEAD)?.[1];
  if (!params) return null;
  const p = new URLSearchParams(params.slice(1).replaceAll(';', '&'));
  const width = Number(p.get('w'));
  const height = Number(p.get('h'));
  return width > 0 && height > 0 ? { width, height } : null;
}

export async function readPageSnapshot(
  thumbnail: string,
): Promise<PageSnapshot | null> {
  const head = thumbnail.match(HEAD);
  if (!head) return null;
  const binary = atob(thumbnail.slice(head[0].length));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const json = await pipe(new DecompressionStream('gzip'), bytes);
  const s = JSON.parse(new TextDecoder().decode(json));
  if (typeof s?.html !== 'string' || !(s.width > 0) || !(s.height > 0)) {
    return null;
  }
  return s;
}

/** The thumbnail of the heatmap card on screen, or undefined without a replay. */
export async function capturePageSnapshot(): Promise<string | undefined> {
  const frame = document.querySelector<HTMLIFrameElement>(
    '#clickmap-render .m-cmap__window iframe',
  );
  const doc = frame?.contentDocument;
  const win = doc?.defaultView;
  const root = doc?.documentElement;
  if (!doc || !win || !root?.scrollWidth || !root.scrollHeight) return;
  const url = await encodePageSnapshot({
    html: serializePage(doc),
    width: root.scrollWidth,
    height: root.scrollHeight,
    frameWidth: win.innerWidth,
    frameHeight: win.innerHeight,
  });
  if (url.length > MAX_LENGTH) {
    console.warn(`Page snapshot too large for a thumbnail: ${url.length}`);
    return;
  }
  return url;
}
