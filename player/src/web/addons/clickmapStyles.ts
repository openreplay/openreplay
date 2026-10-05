const CLICKMAP_OVERLAY_Z_INDEX = 90000;

export const clickmapStyles = {
  overlayStyle: ({ height, width }: { height: string; width: string }) => ({
    position: 'absolute',
    top: '0px',
    left: 0,
    width,
    height,
    background: 'rgba(0,0,0, 0.15)',
    zIndex: CLICKMAP_OVERLAY_Z_INDEX,
  }),
};
