import {
  elementToImage,
  elementToCanvas,
  downscaleDataURL,
} from 'App/utils/screenCapture';

export const renderClickmapThumbnail = async (withIframe?: boolean) => {
  const element = document.querySelector<HTMLIFrameElement>('#clickmap-render');
  let thumbnail: string | undefined;
  if (element) {
    console.debug('trying to render in canvas');
    thumbnail = withIframe ? undefined : await elementToCanvas(element);
    if (!thumbnail) {
      console.debug('trying to capture stream');
      thumbnail = await elementToImage(element);
    }
  }
  if (thumbnail) {
    thumbnail = await downscaleDataURL(thumbnail);
  }

  return thumbnail;
};
