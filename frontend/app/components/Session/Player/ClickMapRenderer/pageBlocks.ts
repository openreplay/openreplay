export type BlockKind = 'band' | 'media' | 'heading' | 'control' | 'text';

/** A part of the replayed page, in page pixels. */
export interface PageBlock {
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SELECTOR = [
  'header',
  'nav',
  'footer',
  'img',
  'picture',
  'video',
  'svg',
  'canvas',
  'iframe',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'button',
  'input',
  'select',
  'textarea',
  'p',
  'li',
  'td',
  'label',
  'blockquote',
].join(',');

// a busy page has tens of thousands of these; the minimap is ~72px wide
const MAX_BLOCKS = 3000;

function kindOf(tag: string): BlockKind {
  switch (tag) {
    case 'header':
    case 'nav':
    case 'footer':
      return 'band';
    case 'img':
    case 'picture':
    case 'video':
    case 'svg':
    case 'canvas':
    case 'iframe':
      return 'media';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading';
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return 'control';
    default:
      return 'text';
  }
}

/** The frozen page's visible parts, the minimap's wireframe of it. */
export function pageBlocks(doc: Document): PageBlock[] {
  const sx = doc.defaultView?.scrollX ?? 0;
  const sy = doc.defaultView?.scrollY ?? 0;
  const blocks: PageBlock[] = [];
  const els = doc.querySelectorAll(SELECTOR);
  for (let i = 0; i < els.length && blocks.length < MAX_BLOCKS; i++) {
    const el = els[i];
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    blocks.push({
      kind: kindOf(el.localName),
      x: r.left + sx,
      y: r.top + sy,
      w: r.width,
      h: r.height,
    });
  }
  return blocks;
}

export interface WireframeInk {
  page: string;
  band: string;
  media: string;
  line: string;
  heading: string;
  control: string;
}

/** Reads the wireframe's colours from the theme tokens. */
export function wireframeInk(el: Element): WireframeInk {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    page: v('--m-surface-default'),
    band: v('--m-surface-sunken'),
    media: v('--m-surface-active'),
    line: v('--m-surface-active'),
    heading: v('--m-content-primary'),
    control: v('--m-content-accent'),
  };
}

/** Draws the blocks scaled by k onto ctx (already sized to the page box). */
export function drawWireframe(
  ctx: CanvasRenderingContext2D,
  blocks: PageBlock[],
  k: number,
  ink: WireframeInk,
) {
  const { width, height } = ctx.canvas;
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink.page;
  ctx.fillRect(0, 0, width, height);
  for (const b of blocks) {
    const x = b.x * k;
    const y = b.y * k;
    const w = Math.max(1, b.w * k);
    // text reads as a line, not a slab, at minimap scale
    const h = Math.max(1, b.kind === 'text' ? Math.min(b.h * k, 2) : b.h * k);
    switch (b.kind) {
      case 'band':
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink.band;
        break;
      case 'media':
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink.media;
        break;
      case 'heading':
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = ink.heading;
        break;
      case 'control':
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = ink.control;
        break;
      default:
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = ink.line;
    }
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
