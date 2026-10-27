import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { millisToMinutesAndSeconds } from 'App/utils';

interface Props {
  children: React.ReactNode;
  endTime: number;
  /** the focus window the lanes zoom into */
  view?: { start: number; end: number } | null;
}

const LINE_PX = 16;

const OverviewPanelContainer = React.memo((props: Props) => {
  const { player } = React.useContext(PlayerContext);
  const { uiPlayerStore } = useStore();
  const { endTime, view } = props;
  const start = view?.start ?? 0;
  const span = Math.max((view?.end ?? endTime) - start, 1);
  const [hover, setHover] = React.useState<number | null>(null);

  const trackBox = (el: HTMLElement) =>
    el.querySelector('.m-dt__lane-track')?.getBoundingClientRect();
  // the track is narrower than the panel: past its end is the end
  const timeAt = (clientX: number, box: DOMRect) =>
    start + Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * span;

  const onClickTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    // portalled popovers bubble through the React tree
    if (!e.currentTarget.contains(e.target as Node)) return;
    const box = trackBox(e.currentTarget);
    if (!box || e.clientX < box.left) return;
    const time = Math.max(Math.round(timeAt(e.clientX, box)), 0);
    if (time) {
      player.jump(time);
    }
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // over a marker a click jumps to the marker, not to the cursor
    if ((e.target as HTMLElement).closest?.('.m-dt__mark-slot')) return;
    const box = trackBox(e.currentTarget);
    setHover(box && e.clientX >= box.left ? timeAt(e.clientX, box) : null);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!view) return;
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (!dx || (!e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY))) return;
    const box = trackBox(e.currentTarget);
    if (!box?.width) return;
    const px = e.deltaMode === 1 ? dx * LINE_PX : dx;
    const next = Math.min(
      Math.max(0, start + (px / box.width) * span),
      Math.max(0, endTime - span),
    );
    uiPlayerStore.toggleZoom({ enabled: true, range: [next, next + span] });
  };

  const at = hover == null ? null : (hover - start) / span;
  return (
    <div
      className={`m-dt__xray${view ? ' is-focused' : ''}`}
      onClick={onClickTrack}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onWheel={onWheel}
    >
      <div className="m-dt__xray-rows">
        {props.children}
        {at != null ? (
          <>
            <i
              className="m-dt__hover-line"
              style={{ '--p': at } as React.CSSProperties}
              aria-hidden="true"
            />
            <b
              className="m-dt__hover-time"
              style={{ '--p': at } as React.CSSProperties}
              aria-hidden="true"
            >
              {millisToMinutesAndSeconds(hover)}
            </b>
          </>
        ) : null}
      </div>
    </div>
  );
});

export default OverviewPanelContainer;
