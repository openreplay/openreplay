import React, { useState, useCallback } from 'react';
import { getTimelinePosition } from 'Components/Session_/Player/Controls/getTimelinePosition';
import { connect } from 'react-redux';
import { toggleZoom } from 'Duck/components/player';

//  perc = ts * scale
// ts = perc / scale

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
    (marker: 'start' | 'end') => () => {
      setDragging(marker);
    },
    []
  );

  const minDistance = 1

  const onDrag = useCallback(
    (event: any) => {
      event.stopPropagation();
      if (dragging && event.clientX !== 0) {
        const newPos = convertToPercentage(event.clientX, event.currentTarget);
        if (dragging === 'start') {
          let startTs = newPos / scale;
          let endTs = endPos / scale;
          setStartPos(newPos);
          if (endPos - newPos <= minDistance) {
            setEndPos(newPos + minDistance);
            endTs = (newPos + minDistance) / scale;
          }
          toggleZoom({ enabled: true, range: [startTs, endTs] });
        } else if (dragging === 'end' && newPos > startPos) {
          let endTs = newPos / scale;
          let startTs = startPos / scale;
          setEndPos(newPos);
          if (newPos - startPos <= minDistance) {
            setStartPos(newPos - minDistance);
            startTs = (newPos - minDistance) / scale;
          }
          toggleZoom({ enabled: true, range: [startTs, endTs] });
        }
      }
    },
    [dragging, startPos, endPos, convertToPercentage]
  );

  const endDrag = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      onMouseMove={onDrag}
      onMouseLeave={endDrag}
      onMouseUp={endDrag}
      style={{ position: 'absolute', width: '100%', height: '24px', left: 0, top: '-4px', zIndex: 99 }}
    >
      <div
        className="marker start"
        onMouseDown={startDrag('start')}
        style={{
          position: 'absolute',
          left: `${startPos}%`,
          width: '6px',
          height: '100%',
          background: '#FCC100',
          cursor: 'grab',
        }}
      />
      <div
        className="marker end"
        onMouseDown={startDrag('end')}
        style={{
          position: 'absolute',
          left: `${endPos}%`,
          width: '6px',
          height: '100%',
          background: '#FCC100',
          cursor: 'grab',
        }}
      />
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

// <div
//   style={{
//     position: 'absolute',
//     top: '-4px',
//     left: `${getTimelinePosition(timelineZoomStartTs, scale)}%`,
//     width: `${(timelineZoomEndTs - timelineZoomStartTs) * scale}%`,
//     border: '2px solid #FCC100',
//     background: 'rgba(252, 193, 0, 0.10)',
//     display: 'flex',
//     justifyContent: 'space-between',
//     borderRadius: 6,
//     height: 24,
//     zIndex: 3,
//   }}
// >