import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ScrollReach } from 'Components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/scrollReach';

import { ScrollLayer } from './ScrollLayer';
import { copyPage } from './pageCopy';

export interface HeatmapPage {
  document: Document;
  /** The click layer as drawn over the page, or null on a scroll map. */
  clicks: HTMLCanvasElement | null;
  /** Bumped by the player each time it freezes a new moment of the page. */
  frame: number;
}

interface Props {
  windowRef: React.RefObject<HTMLDivElement | null>;
  page: HeatmapPage | null;
  /** Bumped by the player on every fit of the page. */
  fit: number;
  reach: ScrollReach | null;
}

/** The page's box in the minimap column: full width, unless the page is taller than the window. */
export function minimapBox(
  columnWidth: number,
  maxHeight: number,
  docWidth: number,
  docHeight: number,
) {
  const aspect = docHeight / docWidth;
  if (columnWidth * aspect <= maxHeight) {
    return { width: columnWidth, height: columnWidth * aspect };
  }
  return { width: maxHeight / aspect, height: maxHeight };
}

/** What the window shows, as fractions of the page: where it starts and how much. */
export function windowView(w: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  if (!w.scrollHeight) return { top: 0, size: 1 };
  return {
    top: w.scrollTop / w.scrollHeight,
    size: Math.min(1, w.clientHeight / w.scrollHeight),
  };
}

interface Box {
  width: number;
  height: number;
  /** Page pixels to minimap pixels. */
  k: number;
  docHeight: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * The whole page small beside the window (a copy of the frozen replay and its
 * heat), with a box for what the window shows. Press or drag on it and the
 * window follows.
 */
export function HeatmapMinimap({ windowRef, page, fit, reach }: Props) {
  const { t } = useTranslation();
  const columnRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [box, setBox] = React.useState<Box>();
  const [view, setView] = React.useState({ top: 0, size: 1 });

  const doc = page?.document;
  const clicks = page?.clicks ?? null;
  const frame = page?.frame;

  const measure = React.useCallback(() => {
    const win = windowRef.current;
    const column = columnRef.current;
    const root = doc?.documentElement;
    const replay = doc?.defaultView;
    if (!win || !column || !replay || !root?.scrollWidth || !root.scrollHeight)
      return;
    const size = minimapBox(
      column.clientWidth,
      win.clientHeight,
      root.scrollWidth,
      root.scrollHeight,
    );
    setBox({
      ...size,
      k: size.width / root.scrollWidth,
      docHeight: root.scrollHeight,
      // the replay's own viewport, so vh units and media queries match
      frameWidth: replay.innerWidth,
      frameHeight: replay.innerHeight,
    });
    setView(windowView(win));
  }, [doc]);

  React.useEffect(measure, [measure, fit]);

  React.useEffect(() => {
    const win = windowRef.current;
    if (!win) return;
    const sync = () => setView(windowView(win));
    win.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(win);
    return () => {
      win.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [measure]);

  // a frozen moment only changes as late assets land, which the copy loads
  // itself; a new height or a new moment is worth copying again for
  const docHeight = box?.docHeight;
  React.useEffect(() => {
    const target = frameRef.current?.contentDocument;
    if (doc && target && docHeight) copyPage(doc, target);
  }, [doc, docHeight, frame]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (clicks) ctx.drawImage(clicks, 0, 0, canvas.width, canvas.height);
  }, [box, clicks, fit]);

  const goTo = (clientY: number) => {
    const win = windowRef.current;
    const target = pageRef.current;
    if (!win || !target) return;
    const r = target.getBoundingClientRect();
    const at = (clientY - r.top) / r.height;
    const { size } = windowView(win);
    win.scrollTop = (at - size / 2) * win.scrollHeight;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    goTo(e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) goTo(e.clientY);
  };

  return (
    <div className="m-cmap__mini" ref={columnRef}>
      {box && (
        <div
          ref={pageRef}
          className="m-cmap__mini-page m-scheme-light"
          style={{ width: box.width, height: box.height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          // pointer only; the window itself scrolls from the keyboard
          title={t('Page overview: drag to move through the page')}
          aria-hidden
        >
          <iframe
            ref={frameRef}
            className="m-cmap__mini-frame"
            sandbox="allow-same-origin"
            title={t('Page overview')}
            data-openreplay-obscured
            inert
            aria-hidden
            style={{
              width: box.frameWidth,
              height: box.frameHeight,
              transform: `scale(${box.k})`,
            }}
          />
          <canvas ref={canvasRef} className="m-cmap__mini-canvas" />
          {reach && <ScrollLayer reach={reach} labels={false} />}
          <span
            className="m-cmap__view"
            style={{ top: `${view.top * 100}%`, height: `${view.size * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
