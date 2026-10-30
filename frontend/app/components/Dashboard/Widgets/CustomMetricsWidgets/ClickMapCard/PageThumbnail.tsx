import { type ClickPoint, heatmapCells } from 'Player/web/addons/TargetMarker';
import SimpleHeatmap from 'Player/web/addons/simpleHeatmap';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ScrollLayer } from 'App/components/Session/Player/ClickMapRenderer/ScrollLayer';
import {
  type PageSnapshot,
  isPageSnapshot,
  readPageSnapshot,
} from 'App/components/Session/Player/ClickMapRenderer/pageSnapshot';

import { type ScrollMapData, scrollReach } from './scrollReach';

interface Props {
  thumbnail: string;
  points?: ClickPoint[] | null;
  scroll?: ScrollMapData | null;
}

/** The click layer over the top of the page, at the thumbnail's scale. */
function ClickHeat({
  points,
  width,
  height,
  pageHeight,
  k,
}: {
  points: ClickPoint[];
  width: number;
  height: number;
  pageHeight: number;
  k: number;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    // cells sit in the whole page; those below the top fall off the canvas
    const { cells, max } = heatmapCells(points, canvas.width, pageHeight * dpr);
    const scale = k * dpr;
    const heatmap = new SimpleHeatmap()
      .setCanvas(canvas)
      .setData(cells)
      .setRadius(15 * scale, 10 * scale)
      .setMax(max)
      .resize()
      .draw();
    return () => heatmap.destroy();
  }, [points, width, height, pageHeight, k]);
  return (
    <canvas
      ref={ref}
      className="m-cmap__thumb-heat"
      style={{ width, height }}
    />
  );
}

/**
 * A heatmap card on a dashboard: the page saved with the card, drawn by the
 * browser in a frame that runs nothing, under the card's current heat.
 */
export default function PageThumbnail({ thumbnail, points, scroll }: Props) {
  const { t } = useTranslation();
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [snapshot, setSnapshot] = React.useState<PageSnapshot | null>(null);
  const isSnapshot = isPageSnapshot(thumbnail);

  React.useEffect(() => {
    if (!isSnapshot) return;
    let alive = true;
    readPageSnapshot(thumbnail)
      .then((s) => alive && setSnapshot(s))
      .catch((e) => console.error('Unreadable page thumbnail', e));
    return () => {
      alive = false;
    };
  }, [thumbnail, isSnapshot]);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () =>
      setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reach = React.useMemo(() => scrollReach(scroll), [scroll]);

  // cards saved before page thumbnails carry a picture
  if (!isSnapshot) {
    return (
      <div className="m-cmap__thumb">
        <img src={thumbnail} alt={t('Click map thumbnail')} />
      </div>
    );
  }

  const k = snapshot && box.width ? box.width / snapshot.width : 0;
  const pageHeight = snapshot ? snapshot.height * k : 0;
  return (
    <div className="m-cmap__thumb" ref={boxRef} data-openreplay-obscured>
      {snapshot && k > 0 && (
        <div
          className="m-cmap__thumb-page m-scheme-light"
          style={{ height: pageHeight }}
        >
          <iframe
            className="m-cmap__mini-frame"
            // no scripts, no same origin: the markup is the recorded site's
            sandbox=""
            srcDoc={snapshot.html}
            title={t('Click map thumbnail')}
            inert
            aria-hidden
            tabIndex={-1}
            style={{
              width: snapshot.frameWidth,
              height: snapshot.frameHeight,
              transform: `scale(${k})`,
            }}
          />
          {reach ? (
            <ScrollLayer reach={reach} labels={false} />
          ) : points?.length ? (
            <ClickHeat
              points={points}
              width={box.width}
              height={Math.min(pageHeight, box.height)}
              pageHeight={pageHeight}
              k={k}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
