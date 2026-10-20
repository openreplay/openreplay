import React, { type FC, type RefObject, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressCircle } from 'App/player-ui';

interface Props {
  /** percent of the bar */
  left: number;
  live?: boolean;
  paused?: boolean;
  /** the bar the handle runs along */
  trackRef: RefObject<HTMLElement | null>;
  /** where the held handle is, in percent; null once it is let go */
  onScrub: (pct: number | null) => void;
  /** where it was let go, in percent */
  onRelease: (pct: number) => void;
}

/** The playhead: follows the pointer while held, seeks once on release. */
const DraggableCircle: FC<Props> = memo(
  ({ left, live, paused, trackRef, onScrub, onRelease }) => {
    const { t } = useTranslation();
    // the bar can't move under a held pointer: measured once per drag
    const box = useRef<DOMRect | null>(null);
    const last = useRef<number | null>(null);
    const pctAt = (x: number) => {
      const b = box.current!;
      return b.width
        ? Math.min(100, Math.max(0, ((x - b.left) / b.width) * 100))
        : 0;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !trackRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      box.current = trackRef.current.getBoundingClientRect();
      e.currentTarget.setPointerCapture(e.pointerId);
      last.current = pctAt(e.clientX);
      onScrub(last.current);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!box.current) return;
      last.current = pctAt(e.clientX);
      onScrub(last.current);
    };
    const onPointerUp = () => {
      if (!box.current) return;
      box.current = null;
      const pct = last.current;
      last.current = null;
      if (pct != null) onRelease(pct);
    };
    const onPointerCancel = () => {
      box.current = null;
      last.current = null;
      onScrub(null);
    };
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 10 : 1;
      const to: Record<string, number> = {
        ArrowLeft: left - step,
        ArrowDown: left - step,
        ArrowRight: left + step,
        ArrowUp: left + step,
        Home: 0,
        End: 100,
      };
      if (!(e.key in to)) return;
      // the player's own arrow seeking must not run as well
      e.preventDefault();
      e.stopPropagation();
      onRelease(Math.min(100, Math.max(0, to[e.key])));
    };

    return (
      <div
        role="slider"
        aria-label={t('Playhead')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(left)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // the release is the seek; the bar's own click must not seek again
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: `${Math.min(left, 100)}%`,
          height: '100%',
          zIndex: 99,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <ProgressCircle paused={paused} isGreen={left > 99 && live} />
      </div>
    );
  },
);

export default DraggableCircle;
