import { capturePageSnapshot } from 'App/components/Session/Player/ClickMapRenderer/pageSnapshot';

/** A heatmap card's thumbnail: the page on screen, its heat drawn on a dashboard. */
export const renderClickmapThumbnail = async (_withIframe?: boolean) => {
  const thumbnail = await capturePageSnapshot();
  if (!thumbnail) {
    console.error('Failed to render clickmap thumbnail');
  }
  return thumbnail;
};
