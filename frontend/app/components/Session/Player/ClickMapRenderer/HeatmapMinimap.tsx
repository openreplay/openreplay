import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ScrollReach } from 'Components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/scrollReach';

import { ScrollLayer } from './ScrollLayer';
import { drawWireframe, pageBlocks, wireframeInk } from './pageBlocks';

export interface HeatmapPage {
  document: Document;
  /** The click layer as drawn over the page, or null on a scroll map. */
  clicks: HTMLCanvasElement | null;
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

/**
 * The whole page small beside the window (a wireframe of the frozen replay and
 * its heat), with a box for what the window shows. Press or drag on it and the
 * window follows.
 */
export function HeatmapMinimap({ windowRef, page, fit, reach }: Props) {
  const { t } = useTranslation();
  const columnRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [box, setBox] = React.useState<{ width: number; height: number }>();
  const [view, setView] = React.useState({ top: 0, size: 1 });

  const doc = page?.document;
  const clicks = page?.clicks ?? null;

  const measure = React.useCallback(() => {
    const win = windowRef.current;
    const column = columnRef.current;
    const root = doc?.documentElement;
    if (!win || !column || !root?.scrollWidth || !root.scrollHeight) return;
    setBox(
      minimapBox(
        column.clientWidth,
        win.clientHeight,
        root.scrollWidth,
        root.scrollHeight,
      ),
    );
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

  const blocks = React.useMemo(() => (doc ? pageBlocks(doc) : []), [doc, fit]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const docWidth = doc?.documentElement.scrollWidth;
    if (!canvas || !box || !docWidth) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWireframe(ctx, blocks, canvas.width / docWidth, wireframeInk(canvas));
    if (clicks) ctx.drawImage(clicks, 0, 0, canvas.width, canvas.height);
  }, [box, blocks, clicks, doc]);

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
          role="scrollbar"
          aria-label={t('Page overview: drag to move through the page')}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(view.top * 100)}
        >
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
