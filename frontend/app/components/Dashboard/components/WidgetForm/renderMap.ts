import { elementToImage, elementToCanvas } from 'App/utils/screenCapture';

export const renderClickmapThumbnail = async (withIframe?: boolean) => {
  const element = document.querySelector<HTMLIFrameElement>('#clickmap-render');
  let thumbnail: string | undefined;
  if (element) {
    if (!withIframe) {
      console.debug('trying to render in canvas');
      thumbnail = withIframe ? undefined : await elementToCanvas(element);
    }
    if (!thumbnail) {
      thumbnail = await elementToImage(element);
    }
  }
  if (!thumbnail) {
    console.error('Failed to render clickmap thumbnail');
  }

  return thumbnail;
};
