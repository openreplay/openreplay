export const clickmapStyles = {
  overlayStyle: ({ height, width, scale }: { height: string, width: string, scale: number }) => ({
    transform: `scale(${scale}) translate(-50%, 0)`,
    position: 'absolute',
    top: '0px',
    left: '50%',
    width,
    height,
    background: 'rgba(0,0,0, 0.15)',
    zIndex: 9 * 10e3,
    transformOrigin: 'left top',
  }),
  totalClicks: {
    fontSize: '16px',
    fontWeight: '600',
  },
  bubbleContainer: ({ top, left, height }: { top: number; left: number, height: number }) => ({
    position: 'absolute',
    top: top > 75 ? top + 'px' : height+75 + 'px',
    width: '250px',
    left: `${left}px`,
    padding: '10px',
    borderRadius: '6px',
    background: 'white',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    boxShadow: '0px 2px 10px 2px rgba(0,0,0,0.5)',
    transform:  top > 20 ? 'translate(-25%, -110%)' : 'translate(-25%, 0%)',
    textAlign: 'center',
    visibility: 'hidden',
    zIndex: 10,
  }),
  highlight: ({
    width,
    height,
    top,
    left,
    zIndex,
  }: {
    width: number;
    height: number;
    top: number;
    left: number;
    zIndex: number;
  }) => ({
    width: `${width}px`,
    height: `${height}px`,
    border: '2px dotted red',
    cursor: 'pointer',
    top: `${top}px`,
    left: `${left}px`,
    position: 'absolute',
    zIndex,
  }),
  clicks: ({ top, height, isRage, left }: { top: number; height: number, isRage?: boolean, left: number }) => ({
    top: top > 20 ? 0 : `${height}px`,
    left: left < 5 ? '100%' : 0,
    position: 'absolute',
    borderRadius: '999px',
    padding: '6px',
    background: isRage ? 'red' : 'white',
    color: isRage ? 'white' : 'black',
    lineHeight: '0.5',
    transform: 'translate(-70%, -70%)',
  }),
};
