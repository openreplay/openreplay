import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';



import { getTimelinePosition } from 'Components/Session_/Player/Controls/getTimelinePosition';
import { toggleZoom } from 'Duck/components/player';


interface Props {
  timelineZoomStartTs: number;
  timelineZoomEndTs: number;
  scale: number;
  toggleZoom: typeof toggleZoom;
}

const DraggableMarkers = ({ timelineZoomStartTs, timelineZoomEndTs, scale, toggleZoom }: Props) => {
  const [startPos, setStartPos] = useState(getTimelinePosition(timelineZoomStartTs, scale));
  const [endPos, setEndPos] = useState(getTimelinePosition(timelineZoomEndTs, scale));
  const [dragging, setDragging] = useState<string | null>(null);

  const convertToPercentage = useCallback((clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    return (x / rect.width) * 100;
  }, []);

  const startDrag = useCallback(
    (marker: 'start' | 'end' | 'body') => (event: React.MouseEvent) => {
      event.stopPropagation();
      setDragging(marker);
    },
    [convertToPercentage, startPos]
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
          toggleZoom({ enabled: true, range: [newPos / scale, endPos / scale] });
        } else if (dragging === 'end') {
          setEndPos(newPos);
          if (newPos - startPos <= minDistance) {
            setStartPos(newPos - minDistance);
          }
          toggleZoom({ enabled: true, range: [startPos / scale, newPos / scale] });
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
          toggleZoom({ enabled: true, range: [newStartPos / scale, newEndPos / scale] });
        }
      }
    },
    [dragging, startPos, endPos, scale, toggleZoom]
  );

  const endDrag = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      onMouseMove={onDrag}
      onMouseLeave={endDrag}
      onMouseUp={endDrag}
      style={{
        position: 'absolute',
        width: '100%',
        height: '24px',
        left: 0,
        top: '-4px',
        zIndex: 100,
      }}
    >
      <div
        className="marker start"
        onMouseDown={startDrag("start")}
        style={{
          position: "absolute",
          left: `${startPos}%`,
          height: "100%",
          background: "#FCC100",
          cursor: "ew-resize",
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          paddingRight: 3,
          paddingLeft: 6,
          width: 18,
        }}
      >
        <div className={"bg-black rounded-xl"} style={{ zIndex: 101, height: 18, width: 2, marginRight: 3, overflow: "hidden" }} />
        <div className={"bg-black rounded-xl"} style={{ zIndex: 101, height: 18, width: 2, overflow: "hidden" }} />
      </div>
      <div
        className="slider-body"
        onMouseDown={startDrag("body")}
        style={{
          position: "absolute",
          left: `calc(${startPos}% + 18px)`,
          width: `calc(${endPos - startPos}% - 18px)`,
          height: '100%',
          background: 'rgba(252, 193, 0, 0.10)',
          borderTop: '2px solid #FCC100',
          borderBottom: '2px solid #FCC100',
          cursor: 'grab',
          zIndex: 100,
        }}
      />
      <div
        className="marker end"
        onMouseDown={startDrag('end')}
        style={{
          position: 'absolute',
          left: `${endPos}%`,
          height: '100%',
          background: '#FCC100',
          cursor: 'ew-resize',
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 3,
          paddingRight: 6,
          width: 18,
        }}
      >
        <div className={'bg-black rounded-xl'} style={{ zIndex: 101, height: 18, width: 2, marginRight: 3, overflow: 'hidden' }} />
        <div className={'bg-black rounded-xl'} style={{ zIndex: 101, height: 18, width: 2, overflow: 'hidden' }} />
      </div>
    </div>
  );
};

export default connect(
  (state: Record<string, any>) => ({
    timelineZoomStartTs: state.getIn(['components', 'player']).timelineZoom.startTs,
    timelineZoomEndTs: state.getIn(['components', 'player']).timelineZoom.endTs,
  }),
  { toggleZoom }
)(DraggableMarkers);
