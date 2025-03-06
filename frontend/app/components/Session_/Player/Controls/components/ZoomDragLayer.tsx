import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { getTimelinePosition } from 'Components/Session_/Player/Controls/getTimelinePosition';
import { PlayerContext } from 'App/components/Session/playerContext';
import { shortDurationFromMs } from 'App/date';
import { throttle } from 'App/utils';

interface Props {
  scale: number;
}

export const HighlightDragLayer = observer(({ scale }: Props) => {
  const { uiPlayerStore } = useStore();
  const { player, store } = React.useContext(PlayerContext);
  const sessEnd = store.get().endTime;
  const toggleHighlight = uiPlayerStore.toggleHighlightSelection;
  const timelineHighlightStartTs = uiPlayerStore.highlightSelection.startTs;
  const timelineHighlightEndTs = uiPlayerStore.highlightSelection.endTs;
  const lastStartTs = React.useRef(timelineHighlightStartTs);
  const lastEndTs = React.useRef(timelineHighlightEndTs);

  const [throttledJump] = React.useMemo(
    () => throttle(player.jump, 25),
    [player],
  );
  React.useEffect(() => {
    if (timelineHighlightStartTs !== lastStartTs.current) {
      player.pause();
      throttledJump(timelineHighlightStartTs, true);
      lastStartTs.current = timelineHighlightStartTs;
      return;
    }
    if (timelineHighlightEndTs !== lastEndTs.current) {
      player.pause();
      throttledJump(timelineHighlightEndTs, true);
      lastEndTs.current = timelineHighlightEndTs;
    }
  }, [timelineHighlightStartTs, timelineHighlightEndTs]);

  const onDrag = (start: number, end: number) => {
    toggleHighlight({
      enabled: true,
      range: [start, end],
    });
  };

  return (
    <DraggableMarkers
      scale={scale}
      onDragEnd={onDrag}
      defaultStartPos={timelineHighlightStartTs}
      defaultEndPos={timelineHighlightEndTs}
      sessEnd={sessEnd}
    />
  );
});

export const ZoomDragLayer = observer(({ scale }: Props) => {
  const { uiPlayerStore } = useStore();
  const { toggleZoom } = uiPlayerStore;
  const timelineZoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const timelineZoomEndTs = uiPlayerStore.timelineZoom.endTs;

  const onDrag = (start: number, end: number) => {
    toggleZoom({
      enabled: true,
      range: [start, end],
    });
  };

  return (
    <DraggableMarkers
      scale={scale}
      onDragEnd={onDrag}
      defaultStartPos={timelineZoomStartTs}
      defaultEndPos={timelineZoomEndTs}
    />
  );
});

export const ExportEventsSelection = observer(({ scale }: Props) => {
  const { uiPlayerStore } = useStore();
  const toggleExportEventsSelection = uiPlayerStore.toggleExportEventsSelection;
  const timelineZoomStartTs = uiPlayerStore.exportEventsSelection.startTs;
  const timelineZoomEndTs = uiPlayerStore.exportEventsSelection.endTs;

  const onDrag = (start: number, end: number) => {
    toggleExportEventsSelection({
      enabled: true,
      range: [start, end],
    });
  };

  return (
    <DraggableMarkers
      scale={scale}
      onDragEnd={onDrag}
      defaultStartPos={timelineZoomStartTs}
      defaultEndPos={timelineZoomEndTs}
    />
  );
});

function DraggableMarkers({
  scale,
  onDragEnd,
  defaultStartPos,
  defaultEndPos,
  sessEnd,
}: {
  scale: Props['scale'];
  onDragEnd: (start: number, end: number) => void;
  defaultStartPos: number;
  defaultEndPos: number;
  sessEnd?: number;
}) {
  const [startPos, setStartPos] = useState(
    getTimelinePosition(defaultStartPos, scale),
  );
  const [endPos, setEndPos] = useState(
    getTimelinePosition(defaultEndPos, scale),
  );
  const [dragging, setDragging] = useState<string | null>(null);

  React.useEffect(() => {
    if (dragging) {
      return;
    }
    setStartPos(getTimelinePosition(defaultStartPos, scale));
    setEndPos(getTimelinePosition(defaultEndPos, scale));
  }, [defaultEndPos, defaultStartPos, scale, dragging]);

  const convertToPercentage = useCallback(
    (clientX: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const x = clientX - rect.left;
      return (x / rect.width) * 100;
    },
    [],
  );

  const startDrag = useCallback(
    (marker: 'start' | 'end' | 'body') => (event: React.MouseEvent) => {
      event.stopPropagation();
      setDragging(marker);
    },
    [convertToPercentage, startPos],
  );

  const minDistance = 1.5;
  const onDrag = useCallback(
    (event: any) => {
      event.stopPropagation();
      if (dragging && event.clientX !== 0) {
        const newPos = convertToPercentage(event.clientX, event.currentTarget);
        if (dragging === 'start') {
          setStartPos(newPos);
          if (endPos - newPos <= minDistance) {
            setEndPos(newPos + minDistance);
          }
          onDragEnd(newPos / scale, endPos / scale);
        } else if (dragging === 'end') {
          setEndPos(newPos);
          if (newPos - startPos <= minDistance) {
            setStartPos(newPos - minDistance);
          }
          onDragEnd(startPos / scale, newPos / scale);
        } else if (dragging === 'body') {
          const offset = (endPos - startPos) / 2;
          let newStartPos = newPos - offset;
          let newEndPos = newStartPos + (endPos - startPos);
          if (newStartPos < 0) {
            newStartPos = 0;
            newEndPos = endPos - startPos;
          } else if (newEndPos > 100) {
            newEndPos = 100;
            newStartPos = 100 - (endPos - startPos);
          }
          setStartPos(newStartPos);
          setEndPos(newEndPos);
          setTimeout(() => {
            onDragEnd(newStartPos / scale, newEndPos / scale);
          }, 1);
        }
      }
    },
    [dragging, startPos, endPos, scale, onDragEnd],
  );

  const endDrag = useCallback(() => {
    setDragging(null);
  }, []);

  const barSize = 104;
  const centering = -41;
  const topPadding = 41;
  const uiSize = 16;

  const startRangeStr = shortDurationFromMs(Math.max(defaultStartPos, 0));
  const endRangeStr = shortDurationFromMs(
    Math.min(defaultEndPos, sessEnd ?? defaultEndPos),
  );
  return (
    <div
      onMouseMove={onDrag}
      onMouseUp={endDrag}
      style={{
        position: 'absolute',
        width: '100%',
        height: barSize,
        left: 0,
        top: centering,
        zIndex: 100,
      }}
    >
      <div
        className="marker start"
        onMouseDown={startDrag('start')}
        style={{
          position: 'absolute',
          left: `${startPos}%`,
          height: uiSize,
          top: topPadding,
          background: dragging && dragging !== 'start' ? '#c2970a' : '#FCC100',
          cursor: 'ew-resize',
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          paddingRight: 1,
          paddingLeft: 3,
          width: 10,
          opacity: dragging && dragging !== 'start' ? 0.8 : 1,
        }}
      >
        {dragging === 'start' ? (
          <div className="absolute bg-[#FCC100] text-black rounded-xl px-2 py-1 -top-10 select-none left-1/2 -translate-x-1/2">
            {startRangeStr}
          </div>
        ) : null}
        <div
          className="bg-black/20 rounded-xl"
          style={{
            zIndex: 101,
            height: 16,
            width: 1,
            marginRight: 2,
            overflow: 'hidden',
          }}
        />
        <div
          className="bg-black/20 rounded-xl"
          style={{
            zIndex: 101,
            height: 16,
            width: 1,
            overflow: 'hidden',
          }}
        />
      </div>
      <div
        className="slider-body"
        onMouseDown={startDrag('body')}
        style={{
          position: 'absolute',
          left: `calc(${startPos}% + 10px)`,
          width: `calc(${endPos - startPos}% - 10px)`,
          height: uiSize,
          top: topPadding,
          background: `repeating-linear-gradient(
              -45deg,
              rgba(252, 193, 0, 0.3),
              rgba(252, 193, 0, 0.3) 4px,
              transparent 4px,
              transparent 8px
            )`,
          borderTop: `1px solid ${dragging ? '#c2970a' : '#FCC100'}`,
          borderBottom: `1px solid ${dragging ? '#c2970a' : '#FCC100'}`,
          cursor: 'grab',
          zIndex: 100,
          opacity: dragging ? 0.8 : 1,
        }}
      />
      <div
        className="marker end"
        onMouseDown={startDrag('end')}
        style={{
          position: 'absolute',
          left: `${endPos}%`,
          height: uiSize,
          top: topPadding,
          background: dragging && dragging !== 'end' ? '#c2970a' : '#FCC100',
          cursor: 'ew-resize',
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 1,
          paddingRight: 1,
          width: 10,
          opacity: dragging && dragging !== 'end' ? 0.8 : 1,
        }}
      >
        {dragging === 'end' ? (
          <div className="absolute bg-[#FCC100] text-black rounded-xl px-2 p-1 -top-10 select-none left-1/2 -translate-x-1/2">
            {endRangeStr}
          </div>
        ) : null}
        <div
          className="bg-black/20 rounded-xl"
          style={{
            zIndex: 101,
            height: 16,
            width: 1,
            marginRight: 2,
            marginLeft: 2,
            overflow: 'hidden',
          }}
        />
        <div
          className="bg-black/20 rounded-xl"
          style={{
            zIndex: 101,
            height: 16,
            width: 1,
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}
